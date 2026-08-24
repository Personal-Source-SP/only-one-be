import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { DraftItemDto } from '../dtos/draft-item.dto';
import { MapDraftItemRequestDto, ProcessSearchDataRequestDto } from '../dtos/requests';
import { ProcessSearchDataResponse } from '../dtos/responses';
import { DiscoveredItemDto } from '../dtos/responses/search-items-response.dto';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DraftItemEntity } from '../entities/draft-item.entity';
import { ItemEntity } from '../entities/item.entity';
import {
    DataProviderFeatureErrorType,
    DataProviderFeatureStatus,
    DataProviderFeatureType,
    DraftItemStatus,
    MapDraftItemAction,
    ProductMappingStatus,
} from '../enums';
import { DataProviderFeatureService } from './data-provider-feature.service';
import { DataProviderSearchService } from './data-provider-search.service';

@Injectable()
export class DraftItemService extends BaseService<DraftItemEntity, DraftItemDto> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly dataProviderSearchService: DataProviderSearchService,
        private readonly dataProviderFeatureService: DataProviderFeatureService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DraftItemEntity) draftItemRepository: Repository<DraftItemEntity>,
        @InjectRepository(ItemEntity) private readonly itemRepository: Repository<ItemEntity>,
        @InjectRepository(DataProviderEntity) private readonly dataProviderRepository: Repository<DataProviderEntity>,
    ) {
        super(draftItemRepository, mapper, DraftItemDto, DraftItemService.name);
    }

    async processSearchData(request: ProcessSearchDataRequestDto): Promise<ProcessSearchDataResponse> {
        const providers = await this.getDataProvidersForSearch(request.dataProviderIds);
        if (!providers.length) {
            return new ProcessSearchDataResponse({
                process: 0,
                success: 0,
                error: 0,
                errorsMessage: 'No data providers available with active SEARCH feature',
                totalDraftsCreated: 0,
            });
        }

        const response = new ProcessSearchDataResponse({
            process: providers.length,
            success: 0,
            error: 0,
            errors: [],
            totalDraftsCreated: 0,
        });

        for (const dataProvider of providers) {
            const searchFeature = dataProvider.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
            if (!searchFeature) continue;

            const queries = request.searchQueries?.length ? request.searchQueries : [''];
            const barcodes = request.barcodes?.length ? request.barcodes : [undefined];

            for (const query of queries) {
                for (const barcode of barcodes) {
                    try {
                        const searchRes = await this.dataProviderSearchService.searchItems({
                            dataProviderId: dataProvider.id,
                            searchQuery: query,
                            barcode,
                        });

                        if (searchRes.status === 'success' && searchRes.discoveredItems?.length) {
                            const count = await this.saveDiscoveredProducts(searchFeature, query, searchRes.discoveredItems);
                            response.totalDraftsCreated += count;
                            response.success++;
                            await this.dataProviderFeatureService.recordFeatureSuccess(searchFeature.id);
                        } else if (searchRes.status === 'error' || searchRes.error) {
                            response.error++;
                            const errorMsg = searchRes.error || 'Failed to search items';
                            response.errors.push({
                                dataProviderName: dataProvider.name,
                                errorMessage: errorMsg,
                                searchQuery: query,
                            });
                            await this.dataProviderFeatureService.recordFeatureFailure(
                                searchFeature.id,
                                errorMsg,
                                DataProviderFeatureErrorType.TRANSIENT,
                            );
                        } else {
                            // Search successful but 0 items found
                            response.success++;
                            await this.dataProviderFeatureService.recordFeatureSuccess(searchFeature.id);
                        }
                    } catch (err) {
                        response.error++;
                        const errorMsg = err?.message || 'Unknown error';
                        response.errors.push({
                            dataProviderName: dataProvider.name,
                            errorMessage: errorMsg,
                            searchQuery: query,
                        });
                        await this.dataProviderFeatureService.recordFeatureFailure(
                            searchFeature.id,
                            errorMsg,
                            DataProviderFeatureErrorType.TRANSIENT,
                        );
                    }
                }
            }
        }

        return response;
    }

    async mapDraftItem(draftItemId: string, dto: MapDraftItemRequestDto): Promise<DraftItemDto> {
        const draft = await this.repository.findOne({
            where: { id: draftItemId },
            relations: { dataProviderFeature: { dataProvider: true } },
        });

        if (!draft) {
            throw new NotFoundException(`Draft item id ${draftItemId} not found`);
        }

        if (draft.status === DraftItemStatus.MAPPED) {
            throw new BadRequestException(`Draft item is already mapped`);
        }

        const dataProviderId = draft.dataProviderFeature?.dataProviderId;
        if (!dataProviderId) {
            throw new BadRequestException('Draft item does not have associated data provider');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let targetItemId: string;

            if (dto.action === MapDraftItemAction.CREATE_NEW) {
                const item = queryRunner.manager.create(ItemEntity, {
                    name: dto.itemName || draft.title,
                    code: dto.itemCode || draft.code || undefined,
                    mappingStatus: ProductMappingStatus.MAPPED,
                });
                const savedItem = await queryRunner.manager.save(item);
                targetItemId = savedItem.id;
            } else {
                if (!dto.itemId) {
                    throw new BadRequestException('itemId is required when linking to existing item');
                }
                const existingItem = await queryRunner.manager.findOne(ItemEntity, { where: { id: dto.itemId } });
                if (!existingItem) {
                    throw new NotFoundException(`Item id ${dto.itemId} not found`);
                }
                targetItemId = existingItem.id;
            }

            // Find or create DataProviderItem
            let dpItem = await queryRunner.manager.findOne(DataProviderItemEntity, {
                where: { dataProviderId, itemUrl: draft.url },
            });

            if (!dpItem) {
                dpItem = queryRunner.manager.create(DataProviderItemEntity, {
                    dataProviderId,
                    itemId: targetItemId,
                    itemUrl: draft.url,
                    isActive: true,
                });
                dpItem = await queryRunner.manager.save(dpItem);
            }

            // Update Draft Item
            draft.status = DraftItemStatus.MAPPED;
            draft.mappedItemId = targetItemId;
            draft.mappedDataProviderItemId = dpItem.id;
            const updatedDraft = await queryRunner.manager.save(draft);

            await queryRunner.commitTransaction();
            return this.mapper.map(updatedDraft, DraftItemEntity, DraftItemDto);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async getDataProvidersForSearch(dataProviderIds?: string[]): Promise<DataProviderEntity[]> {
        const builder = this.dataProviderRepository
            .createQueryBuilder('dataProvider')
            .innerJoinAndSelect('dataProvider.features', 'feature', 'feature.type = :featureType', {
                featureType: DataProviderFeatureType.SEARCH,
            })
            .where('feature.status = :status', { status: DataProviderFeatureStatus.READY });

        if (dataProviderIds?.length) {
            builder.andWhere('dataProvider.id IN (:...dataProviderIds)', { dataProviderIds });
        }

        return await builder.getMany();
    }

    private async saveDiscoveredProducts(
        feature: DataProviderFeatureEntity,
        searchQuery: string,
        discovered: DiscoveredItemDto[],
    ): Promise<number> {
        let count = 0;
        for (const item of discovered) {
            if (!item.url || !item.title) continue;

            const existingDraft = await this.repository.findOne({
                where: { dataProviderFeatureId: feature.id, url: item.url },
            });

            if (existingDraft && existingDraft.status === DraftItemStatus.MAPPED) {
                continue;
            }

            // Evaluate matching status with ItemEntity
            let status = DraftItemStatus.NEW;
            let suggestedItemId: string = undefined;

            if (item.code) {
                const matchByCode = await this.itemRepository.findOne({ where: { code: item.code } });
                if (matchByCode) {
                    status = DraftItemStatus.MATCHED;
                    suggestedItemId = matchByCode.id;
                }
            }

            if (status === DraftItemStatus.NEW && item.title) {
                const matchByName = await this.itemRepository.findOne({ where: { name: item.title } });
                if (matchByName) {
                    status = DraftItemStatus.SIMILAR;
                    suggestedItemId = matchByName.id;
                }
            }

            if (existingDraft) {
                existingDraft.title = item.title;
                existingDraft.status = status;
                existingDraft.suggestedItemId = suggestedItemId;
                existingDraft.confidence = item.confidence || 0;
                existingDraft.metadata = {
                    ...existingDraft.metadata,
                    ...item,
                };
                await this.repository.save(existingDraft);
            } else {
                const newDraft = this.repository.create({
                    dataProviderFeatureId: feature.id,
                    title: item.title,
                    url: item.url,
                    code: item.code || undefined,
                    searchQuery,
                    confidence: item.confidence || 0,
                    status,
                    suggestedItemId,
                    metadata: { ...item },
                });
                await this.repository.save(newDraft);
                count++;
            }
        }
        return count;
    }
}
