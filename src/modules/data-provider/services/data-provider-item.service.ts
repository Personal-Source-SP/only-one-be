import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { CreateDataProviderItemRequestDto, DataProviderItemPaginationRequestDto, UpdateDataProviderItemRequestDto } from '../dtos/requests';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { ItemEntity } from '../entities/item.entity';

@Injectable()
export class DataProviderItemService extends BaseService<DataProviderItemEntity> {
    constructor(
        private readonly loggerService: LoggerService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(DataProviderItemEntity)
        private readonly dataProviderItemRepository: Repository<DataProviderItemEntity>,

        @InjectRepository(DataProviderEntity)
        private readonly dataProviderRepository: Repository<DataProviderEntity>,

        @InjectRepository(ItemEntity)
        private readonly itemRepository: Repository<ItemEntity>,
    ) {
        super(dataProviderItemRepository);
    }

    async getOneByFilter(
        filter: FindOptionsWhere<DataProviderItemEntity>,
        options?: { isRandom?: boolean; relations?: string[] },
    ): Promise<DataProviderItemEntity> {
        const queryBuilder = this.dataProviderItemRepository
            .createQueryBuilder('dataProviderItem')
            .leftJoinAndSelect('dataProviderItem.dataProvider', 'dataProvider')
            .where(filter);

        if (options?.isRandom) {
            queryBuilder.limit(20).orderBy('RANDOM()').addOrderBy('dataProviderItem.createdAt', 'DESC');
        }

        if (options?.relations?.length) {
            options.relations.forEach((relation) => {
                queryBuilder.leftJoinAndSelect(`dataProviderItem.${relation}`, relation);
            });
        }

        try {
            const result = await queryBuilder.getOne();
            return result;
        } catch (error) {
            this.loggerService.error(`Error fetching DataProviderItem with filter ${JSON.stringify(filter)}: ${error.message}`);
            throw error;
        }
    }

    async getById(id: string): Promise<DataProviderItemDto> {
        const dataProviderItem = await this.dataProviderItemRepository.findOne({
            where: { id },
            relations: ['dataProvider', 'item'],
        });

        if (!dataProviderItem) {
            throw new NotFoundException('DataProviderItem with ID not found');
        }

        return this.mapper.map(dataProviderItem, DataProviderItemEntity, DataProviderItemDto);
    }

    async getByDataProviderId(dataProviderId: string): Promise<DataProviderItemDto[]> {
        const dataProviderItems = await this.dataProviderItemRepository.find({
            where: { dataProviderId },
            relations: ['item', 'dataProvider'],
        });

        return this.mapper.mapArray(dataProviderItems, DataProviderItemEntity, DataProviderItemDto);
    }

    async getDataProviderItemsPagination(
        query: DataProviderItemPaginationRequestDto,
        globalConfig: PaginateConfig<DataProviderItemEntity>,
    ): Promise<Paginated<DataProviderItemDto>> {
        try {
            const paginatedResult: Paginated<DataProviderItemEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                this.dataProviderItemRepository,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, DataProviderItemEntity, DataProviderItemDto);
            return { ...paginatedResult, data } as Paginated<DataProviderItemDto>;
        } catch (error) {
            this.loggerService.error(`Get data provider items pagination error: ${error?.message}`);

            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async createDataProviderItem(request: CreateDataProviderItemRequestDto): Promise<DataProviderItemDto> {
        // Verify that product exists
        const item = await this.itemRepository.exists({ where: { id: request.itemId } });
        if (!item) {
            throw new NotFoundException(`Item with ID ${request.itemId} not found`);
        }

        // Verify that data provider exists and get its details for validation
        const dataProvider = await this.dataProviderRepository.findOne({
            select: ['id', 'baseUrl'],
            where: { id: request.dataProviderId },
        });
        if (!dataProvider) {
            throw new NotFoundException(`Data Provider with ID ${request.dataProviderId} not found`);
        }

        // Validate that product URL matches data provider base URL
        const isValidUrl = await this.validateItemUrlMatchesBaseUrl(request.itemUrl, dataProvider.baseUrl);
        if (!isValidUrl) {
            throw new BadRequestException(
                `Product URL must start with data provider base URL. Expected: ${dataProvider.baseUrl}, Got: ${request.itemUrl}`,
            );
        }

        // Check if a record with the same productId and dataProviderId already exists
        const existing = await this.findOneByFilter({ itemId: request.itemId, dataProviderId: request.dataProviderId });
        if (existing) {
            throw new ConflictException(
                `DataProviderItem for item ${request.itemId} and provider ${request.dataProviderId} already exists`,
            );
        }

        // Create new entity
        const entity = this.mapper.map(request, CreateDataProviderItemRequestDto, DataProviderItemEntity);
        const dataProviderItem = await this.create(entity);

        return this.mapper.map(dataProviderItem, DataProviderItemEntity, DataProviderItemDto);
    }

    async updateDataProviderItem(id: string, request: UpdateDataProviderItemRequestDto): Promise<boolean> {
        const existing = await this.dataProviderItemRepository.findOne({
            where: { id },
            relations: ['dataProvider'],
        });

        if (!existing) throw new NotFoundException('DataProviderItem with ID not found');

        // Verify product exists if updating
        if (request.itemId) {
            const itemExists = await this.itemRepository.exists({
                where: { id: request.itemId },
            });

            if (!itemExists) throw new NotFoundException(`Item with ID ${request.itemId} not found`);
        }

        let dataProvider = existing.dataProvider;
        if (request.dataProviderId) {
            dataProvider = await this.dataProviderRepository.findOne({
                select: ['id', 'baseUrl'],
                where: { id: request.dataProviderId },
            });

            if (!dataProvider) throw new NotFoundException(`Data Provider with ID ${request.dataProviderId} not found`);
        }

        if (request.itemUrl) {
            const isValidUrl = await this.validateItemUrlMatchesBaseUrl(request.itemUrl, dataProvider.baseUrl);
            if (!isValidUrl) {
                throw new BadRequestException(
                    `Item URL must start with data provider base URL. Expected: ${dataProvider.baseUrl}, Got: ${request.itemUrl}`,
                );
            }
        }

        const result = await this.update(id, request);
        return result;
    }

    async deleteDataProviderItem(id: string): Promise<boolean> {
        const existingItem = await this.exists({ id });
        if (!existingItem) {
            this.loggerService.error(`No data provider item found with id ${id}`);
            throw new NotFoundException('No data provider item found with id');
        }

        return this.delete(id);
    }

    // async triggerScraping(dto: CreateManuallyTriggerScrapingRequestDto): Promise<boolean> {
    //     try {
    //         const { ids } = dto;

    //         if (!ids || ids.length === 0) {
    //             this.loggerService.warn('No DataProviderProduct IDs provided for manual trigger');
    //             throw new Error('No DataProviderProduct IDs provided for manual trigger');
    //         }

    //         // Fetch the DataProviderProducts
    //         const dataProviderProducts = await this.dataProviderItemRepository.count({
    //             where: { id: In(ids) },
    //         });

    //         if (dataProviderProducts !== ids.length) {
    //             this.loggerService.warn('Some DataProviderProduct IDs do not exist');
    //             throw new NotFoundException('Some DataProviderProduct IDs do not exist');
    //         }

    //         // Create scraping jobs for each DataProviderProduct
    //         const res = await this.scrapingJobService.createJobs({
    //             dataProviderProductIds: ids,
    //             priority: dto?.priority,
    //         });

    //         if (!res.success && res.errors.length) {
    //             const errorMessage = res.errors[0].message;
    //             throw new BadRequestException(errorMessage);
    //         }

    //         return res.success;
    //     } catch (error) {
    //         this.loggerService.error(`Trigger scraping failed: ${error?.message}`);
    //         throw error;
    //     }
    // }

    // async triggerScrapingBulk(dto: CreateManuallyTriggerScrapingRequestDto): Promise<boolean> {
    //     try {
    //         const res = await this.scrapingJobService.createJobs({
    //             priority: dto?.priority,
    //             dataProviderItemIds: dto.ids,
    //         });

    //         return res.success;
    //     } catch (error) {
    //         this.loggerService.error(`Trigger scraping bulk failed: ${error?.message}`);
    //         throw error;
    //     }
    // }

    private validateItemUrlMatchesBaseUrl(itemUrl: string, baseUrl: string): boolean {
        return itemUrl.startsWith(baseUrl);
    }
}
