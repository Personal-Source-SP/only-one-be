import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { AppException } from '../../../exceptions/app.exception';
import { StringHelper } from '../../../shared/helpers/string-helper';
import { DataProviderError } from '../constants/data-provider-error';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { ItemDto } from '../dtos/item.dto';
import { IngestDiscoveredUrlResponseDto } from '../dtos/responses';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
import { ItemEntity } from '../entities/item.entity';
import {
    DiscoveryUrlStatus,
    DiscoveryValidationStatus,
    FinalValidationStatus,
    ValidationBatchStatus,
    ValidationOperationStatus,
    ValidationUserAction,
} from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';
import { DataProviderItemService } from './data-provider-item.service';
import { DiscoveryValidationLogService } from './discovery-validation-log.service';
import { ItemService } from './item.service';

@Injectable()
export class DiscoveryUrlService extends BaseService<DiscoveryUrlEntity, DiscoveryUrlDto> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly itemService: ItemService,
        private readonly dataProviderItemService: DataProviderItemService,
        private readonly discoveryValidationLogService: DiscoveryValidationLogService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
    ) {
        super(discoveryUrlRepository, mapper, DiscoveryUrlDto, DiscoveryUrlService.name);
    }

    async ingestDiscoveredUrl(urlId: string): Promise<IngestDiscoveredUrlResponseDto> {
        const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
        if (!urlEntity) throw new AppException(DataProviderError.UrlNotFound(urlId));

        const code = urlEntity.code;
        const name = urlEntity.title?.trim() || urlEntity.code;

        let item: ItemDto = null;
        let isNewItem = false;

        // Step 1: Lookup existing item by required unique code
        if (code) {
            item = await this.itemService.findOneByFilter({ code });
        }

        // Step 2: Create new Item if not found
        if (!item) {
            item = await this.itemService.create({
                name,
                code,
                metadata: urlEntity.metadata || {},
            });

            isNewItem = true;
        }

        // Step 3: Check & create DataProviderItem
        let dataProviderItem = await this.dataProviderItemService.findOneByFilterAndOptions({
            itemId: item.id,
            itemUrl: urlEntity.url,
            dataProviderId: urlEntity.dataProviderId,
        });

        if (!dataProviderItem) {
            dataProviderItem = await this.dataProviderItemService.create({
                itemId: item.id,
                itemUrl: urlEntity.url,
                dataProviderId: urlEntity.dataProviderId,
            });
        }

        // Step 4: Link item to discovery URL and mark status INGESTED
        await this.discoveryUrlRepository.update(urlId, {
            itemId: item.id,
            status: DiscoveryUrlStatus.INGESTED,
        });

        return new IngestDiscoveredUrlResponseDto({
            isNewItem,
            itemId: item.id,
            dataProviderItemId: dataProviderItem.id,
        });
    }

    async ingestDiscoveredUrlsChunk(urlIds: string[]): Promise<IngestDiscoveredUrlResponseDto[]> {
        if (!urlIds || !urlIds.length) return [];

        const urls = await this.discoveryUrlRepository.find({ where: { id: In(urlIds) } });
        if (!urls.length) return [];

        // 1. Collect unique codes for bulk item lookup
        const codes = Array.from(new Set(urls.map((u) => u.code).filter(Boolean)));
        const existingItems = codes.length > 0 ? await this.itemService.findListByFilter({ code: In(codes) }) : [];

        const codeToItemMap = new Map<string, ItemDto>();
        for (const it of existingItems) {
            if (it.code && !codeToItemMap.has(it.code)) codeToItemMap.set(it.code, it);
        }

        // 2. Resolve Items for each URL (Deduplicating in-memory for newly created items)
        const resolvedItems: { urlEntity: DiscoveryUrlEntity; item: ItemDto; isNewItem: boolean }[] = [];

        for (const urlEntity of urls) {
            let matchedItem = codeToItemMap.get(urlEntity.code) || null;
            let isNew = false;

            if (!matchedItem) {
                const name = urlEntity.title?.trim() || urlEntity.code;
                matchedItem = await this.itemService.create({
                    name,
                    code: urlEntity.code,
                    metadata: urlEntity.metadata || {},
                });
                isNew = true;
                codeToItemMap.set(urlEntity.code, matchedItem);
            }

            resolvedItems.push({ urlEntity, item: matchedItem, isNewItem: isNew });
        }

        // 3. Bulk lookup existing DataProviderItems
        const distinctDataProviderIds = Array.from(new Set(urls.map((u) => u.dataProviderId)));
        const existingDataProviders = await this.dataProviderItemService.findListByFilter({
            dataProviderId: In(distinctDataProviderIds),
            itemUrl: In(urls.map((u) => u.url)),
        });

        const dpiMap = new Map<string, DataProviderItemDto>();
        for (const dpi of existingDataProviders) {
            dpiMap.set(`${dpi.dataProviderId}_${dpi.itemId}_${dpi.itemUrl}`, dpi);
        }

        // 4. Ensure DataProviderItems exist
        const results: IngestDiscoveredUrlResponseDto[] = [];
        for (const { urlEntity, item, isNewItem } of resolvedItems) {
            const key = `${urlEntity.dataProviderId}_${item.id}_${urlEntity.url}`;
            let dpi = dpiMap.get(key);

            if (!dpi) {
                dpi = await this.dataProviderItemService.create({
                    itemId: item.id,
                    itemUrl: urlEntity.url,
                    dataProviderId: urlEntity.dataProviderId,
                });
                dpiMap.set(key, dpi);
            }

            // Update individual DiscoveryUrl with itemId and status INGESTED
            await this.discoveryUrlRepository.update(urlEntity.id, {
                itemId: item.id,
                status: DiscoveryUrlStatus.INGESTED,
            });

            results.push(
                new IngestDiscoveredUrlResponseDto({
                    isNewItem,
                    itemId: item.id,
                    dataProviderItemId: dpi.id,
                }),
            );
        }

        return results;
    }

    async updateStatus(urlIds: string[], status: DiscoveryUrlStatus): Promise<void> {
        if (!urlIds?.length) return;
        await this.discoveryUrlRepository.update({ id: In(urlIds) }, { status });
    }

    async revalidateDiscoveredUrl(urlId: string, targetKeyword?: string): Promise<DiscoveryUrlDto> {
        const urlDto = await this.findById(urlId);
        if (!urlDto) throw new AppException(DataProviderError.UrlNotFound(urlId));

        const startTime = Date.now();
        const evalResult = DiscoveryValidationHelper.evaluateUrl({
            targetKeyword,
            url: urlDto.url,
            title: urlDto.title,
            domain: urlDto.domain,
        });

        await this.discoveryValidationLogService.markPreviousLogsNotLatest({ discoveryUrlId: urlId });

        await this.dataSource.transaction(async (manager) => {
            const log = this.discoveryValidationLogService.createValidationLog({
                isLatestLog: true,
                discoveryUrlId: urlDto.id,
                sessionId: urlDto.sessionId,
                matchResult: evalResult.matchResult,
                confidenceScore: evalResult.confidenceScore,
                reason: `Revalidation: ${evalResult.reason}`,
                matchedCriteria: evalResult.matchedCriteria,
                processingDuration: Date.now() - startTime,
                operationStatus: ValidationOperationStatus.COMPLETED,
            });
            await manager.save(DiscoveryValidationLogEntity, log);

            await manager.update(DiscoveryUrlEntity, urlId, {
                matchResult: evalResult.matchResult,
                confidenceScore: evalResult.confidenceScore,
                validationStatus: DiscoveryValidationStatus.COMPLETED,
            });
        });

        urlDto.matchResult = evalResult.matchResult;
        urlDto.confidenceScore = evalResult.confidenceScore;
        urlDto.validationStatus = DiscoveryValidationStatus.COMPLETED;

        return urlDto;
    }

    async submitUserAction(urlId: string, action: ValidationUserAction, reason?: string): Promise<boolean> {
        const finalStatus = action === ValidationUserAction.CONFIRM ? FinalValidationStatus.APPROVED : FinalValidationStatus.REJECTED;

        const success = await this.update(urlId, {
            userAction: action,
            userActionReason: reason,
            userActionDate: new Date(),
            finalValidationStatus: finalStatus,
        });

        if (action === ValidationUserAction.CONFIRM && success) {
            await this.ingestDiscoveredUrl(urlId);
        }

        return success;
    }

    async submitBulkUserActions(urlIds: string[], action: ValidationUserAction, reason?: string): Promise<boolean> {
        const finalStatus = action === ValidationUserAction.CONFIRM ? FinalValidationStatus.APPROVED : FinalValidationStatus.REJECTED;

        const result = await this.discoveryUrlRepository.update(
            { id: In(urlIds) },
            {
                userAction: action,
                userActionReason: reason,
                userActionDate: new Date(),
                finalValidationStatus: finalStatus,
            },
        );

        if (action === ValidationUserAction.CONFIRM) {
            try {
                await this.ingestDiscoveredUrlsChunk(urlIds);
            } catch (err) {
                this.loggerService.warn(`[submitBulkUserActions] Failed to ingest discovered URLs: ${err?.message}`);
            }
        }

        return (result.affected ?? 0) > 0;
    }

    async getValidationLogsByUrl(urlId: string): Promise<DiscoveryValidationLogDto[]> {
        return await this.discoveryValidationLogService.getValidationLogsByUrl(urlId);
    }

    async processDiscoveryValidation(sessionId: string, urlId: string, targetKeyword?: string): Promise<void> {
        const startTime = Date.now();

        const session = await this.dataSource.getRepository(DiscoverySessionEntity).findOne({ where: { id: sessionId } });
        if (!session || session.validationStatus === ValidationBatchStatus.CANCELLED) {
            this.loggerService.warn(`Validation skipped: session ${sessionId} not found or cancelled`);
            return;
        }

        const url = await this.findById(urlId);
        if (!url) {
            this.loggerService.warn(`Validation skipped: URL ${urlId} not found`);
            return;
        }

        const evalResult = DiscoveryValidationHelper.evaluateUrl({
            targetKeyword,
            url: url.url,
            title: url.title,
            domain: url.domain,
        });

        await this.dataSource.transaction(async (manager) => {
            await manager.update(DiscoveryUrlEntity, urlId, {
                matchResult: evalResult.matchResult,
                confidenceScore: evalResult.confidenceScore,
                validationStatus: DiscoveryValidationStatus.COMPLETED,
            });

            await manager.save(
                DiscoveryValidationLogEntity,
                this.discoveryValidationLogService.createValidationLog({
                    sessionId,
                    isLatestLog: true,
                    discoveryUrlId: urlId,
                    reason: evalResult.reason,
                    matchResult: evalResult.matchResult,
                    confidenceScore: evalResult.confidenceScore,
                    matchedCriteria: evalResult.matchedCriteria,
                    processingDuration: Date.now() - startTime,
                    operationStatus: ValidationOperationStatus.COMPLETED,
                }),
            );
        });

        this.loggerService.log(`Successfully validated discovery URL ${urlId}`);
    }

    extractCodeFromUrl(url: string, title?: string): string | undefined {
        if (title?.trim()) {
            const slug = StringHelper.slugify(title.trim());
            if (slug) {
                return slug.length > 100 ? slug.substring(0, 100) : slug;
            }
        }

        if (url?.trim()) {
            try {
                const parsed = new URL(url);
                const skuParam =
                    parsed.searchParams.get('sku') ||
                    parsed.searchParams.get('code') ||
                    parsed.searchParams.get('productId') ||
                    parsed.searchParams.get('id');

                if (skuParam && skuParam.length <= 100) {
                    return skuParam;
                }

                const dpMatch = parsed.pathname.match(/\/(?:dp|product|p|item)\/([A-Za-z0-9_-]{3,100})/i);
                if (dpMatch && dpMatch[1]) {
                    return dpMatch[1];
                }

                const pathSegments = parsed.pathname.split('/').filter(Boolean);
                if (pathSegments.length > 0) {
                    const lastSegment = pathSegments[pathSegments.length - 1];
                    const slug = StringHelper.slugify(lastSegment);
                    if (slug) {
                        return slug.length > 100 ? slug.substring(0, 100) : slug;
                    }
                }
            } catch {
                const slug = StringHelper.slugify(url);
                if (slug) {
                    return slug.length > 100 ? slug.substring(0, 100) : slug;
                }
            }
        }

        return undefined;
    }
}
