import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { AppException } from '../../../exceptions/app.exception';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { QueueService } from '../../queue/services/queue.service';
import { DataProviderError } from '../constants/data-provider-error';
import { DISCOVERY_INGESTION_CHUNK_SIZE } from '../constants/discovery-constants';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { ItemDto } from '../dtos/item.dto';
import { IngestDiscoveredUrlResponseDto, IngestDiscoveryUrlResponseDto } from '../dtos/responses';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
import { ItemEntity } from '../entities/item.entity';
import {
    DiscoveryUrlStatus,
    DiscoveryValidationStatus,
    FinalValidationStatus,
    ValidationOperationStatus,
    ValidationUserAction,
} from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';
import { DataProviderItemService } from './data-provider-item.service';
import { DiscoverySessionService } from './discovery-session.service';
import { DiscoveryValidationLogService } from './discovery-validation-log.service';
import { ItemService } from './item.service';

@Injectable()
export class DiscoveryUrlService extends BaseService<DiscoveryUrlEntity, DiscoveryUrlDto> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly itemService: ItemService,
        private readonly queueService: QueueService,
        private readonly dataProviderItemService: DataProviderItemService,
        private readonly discoveryValidationLogService: DiscoveryValidationLogService,
        @Inject(forwardRef(() => DiscoverySessionService))
        private readonly discoverySessionService: DiscoverySessionService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
    ) {
        super(discoveryUrlRepository, mapper, DiscoveryUrlDto, DiscoveryUrlService.name);
    }

    async ingestDiscoveredUrl(urlId: string): Promise<IngestDiscoveredUrlResponseDto> {
        const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
        if (!urlEntity) throw new AppException(DataProviderError.UrlNotFound(urlId));

        const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
        const name = urlEntity.title?.trim() || urlEntity.url;

        let item: ItemDto = null;
        let isNewItem = false;

        // Step 1 & 2: Combined single query check by code OR name
        const itemConditions: FindOptionsWhere<ItemEntity>[] = [];
        if (code) itemConditions.push({ code });
        if (name) itemConditions.push({ name });

        if (itemConditions.length > 0) {
            const existingItems = await this.itemService.findListByFilter(itemConditions);
            if (code) {
                item = existingItems.find((i) => i.code === code) || null;
            }
            if (!item && name) {
                item = existingItems.find((i) => i.name === name) || null;
            }
        }

        // Step 3: Create new Item if not found
        if (!item) {
            item = await this.itemService.create({ name, code: code || undefined });
            isNewItem = true;
        }

        // Step 4: Check & create DataProviderItem
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

        // Step 5: Mark status INGESTED
        await this.discoveryUrlRepository.update(urlId, { status: DiscoveryUrlStatus.INGESTED });

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

        // 1. Extract metadata for all URLs in chunk
        const urlMetadataList = urls.map((urlEntity) => {
            const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
            const name = urlEntity.title?.trim() || urlEntity.url;
            return { urlEntity, code, name };
        });

        // 2. Collect unique codes and names for bulk item lookup
        const codes = Array.from(new Set(urlMetadataList.map((m) => m.code).filter(Boolean)));
        const names = Array.from(new Set(urlMetadataList.map((m) => m.name).filter(Boolean)));

        const itemConditions: FindOptionsWhere<ItemEntity>[] = [];
        if (codes.length > 0) itemConditions.push({ code: In(codes) });
        if (names.length > 0) itemConditions.push({ name: In(names) });

        const existingItems = itemConditions.length > 0 ? await this.itemService.findListByFilter(itemConditions) : [];

        const codeToItemMap = new Map<string, ItemDto>();
        const nameToItemMap = new Map<string, ItemDto>();

        for (const it of existingItems) {
            if (it.code && !codeToItemMap.has(it.code)) codeToItemMap.set(it.code, it);
            if (it.name && !nameToItemMap.has(it.name)) nameToItemMap.set(it.name, it);
        }

        // 3. Resolve Items for each URL (Deduplicating in-memory for newly created items)
        const resolvedItems: { meta: (typeof urlMetadataList)[0]; item: ItemDto; isNewItem: boolean }[] = [];

        for (const meta of urlMetadataList) {
            let matchedItem: ItemDto = null;
            let isNew = false;

            if (meta.code && codeToItemMap.has(meta.code)) {
                matchedItem = codeToItemMap.get(meta.code);
            } else if (meta.name && nameToItemMap.has(meta.name)) {
                matchedItem = nameToItemMap.get(meta.name);
            }

            if (!matchedItem) {
                matchedItem = await this.itemService.create({ name: meta.name, code: meta.code || undefined });
                isNew = true;
                if (meta.code) codeToItemMap.set(meta.code, matchedItem);
                if (meta.name) nameToItemMap.set(meta.name, matchedItem);
            }

            resolvedItems.push({ meta, item: matchedItem, isNewItem: isNew });
        }

        // 4. Bulk lookup existing DataProviderItems
        const distinctDataProviderIds = Array.from(new Set(urls.map((u) => u.dataProviderId)));
        const existingDataProviders = await this.dataProviderItemService.findListByFilter({
            dataProviderId: In(distinctDataProviderIds),
            itemUrl: In(urls.map((u) => u.url)),
        });

        const dpiMap = new Map<string, DataProviderItemDto>();
        for (const dpi of existingDataProviders) {
            dpiMap.set(`${dpi.dataProviderId}_${dpi.itemId}_${dpi.itemUrl}`, dpi);
        }

        // 5. Ensure DataProviderItems exist
        const results: IngestDiscoveredUrlResponseDto[] = [];
        for (const { meta, item, isNewItem } of resolvedItems) {
            const key = `${meta.urlEntity.dataProviderId}_${item.id}_${meta.urlEntity.url}`;
            let dpi = dpiMap.get(key);

            if (!dpi) {
                dpi = await this.dataProviderItemService.create({
                    itemId: item.id,
                    itemUrl: meta.urlEntity.url,
                    dataProviderId: meta.urlEntity.dataProviderId,
                });
                dpiMap.set(key, dpi);
            }

            results.push(
                new IngestDiscoveredUrlResponseDto({
                    isNewItem,
                    itemId: item.id,
                    dataProviderItemId: dpi.id,
                }),
            );
        }

        // 6. Bulk update DiscoveryUrls status to INGESTED
        const processedIds = urls.map((u) => u.id);
        await this.discoveryUrlRepository.update({ id: In(processedIds) }, { status: DiscoveryUrlStatus.INGESTED });

        return results;
    }

    async batchIngest(sessionId: string, urlIds?: string[]): Promise<IngestDiscoveryUrlResponseDto> {
        const session = await this.discoverySessionService.findById(sessionId);
        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));

        const whereCondition: FindOptionsWhere<DiscoveryUrlEntity> = { sessionId };
        if (urlIds && urlIds.length > 0) {
            whereCondition.id = In(urlIds);
        } else {
            whereCondition.finalValidationStatus = FinalValidationStatus.APPROVED;
        }

        const urls = await this.discoveryUrlRepository.find({ where: whereCondition });
        if (!urls.length) {
            return new IngestDiscoveryUrlResponseDto({
                sessionId,
                totalQueued: 0,
                itemsReused: 0,
                itemsCreated: 0,
                totalProcessed: 0,
                dataProviderItemsCreated: 0,
            });
        }

        const targetUrlIds = urls.map((u) => u.id);
        await this.discoveryUrlRepository.update({ id: In(targetUrlIds) }, { status: DiscoveryUrlStatus.QUEUED });

        const jobs = [];
        for (let i = 0; i < urls.length; i += DISCOVERY_INGESTION_CHUNK_SIZE) {
            const chunk = urls.slice(i, i + DISCOVERY_INGESTION_CHUNK_SIZE);
            jobs.push({
                data: {
                    sessionId,
                    urlIds: chunk.map((u) => u.id),
                    dataProviderId: chunk[0].dataProviderId,
                },
                opts: {
                    attempts: 3,
                    removeOnComplete: true,
                    backoff: {
                        delay: 2000,
                        type: 'exponential',
                    },
                },
            });
        }

        await this.queueService.addBulkJob(QUEUE_NAME.DISCOVERY_INGESTION_JOB, jobs);

        return new IngestDiscoveryUrlResponseDto({
            sessionId,
            itemsReused: 0,
            itemsCreated: 0,
            totalQueued: urls.length,
            totalProcessed: urls.length,
            dataProviderItemsCreated: 0,
        });
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

    private extractCodeFromUrl(url: string, title?: string): string | undefined {
        try {
            const parsed = new URL(url);
            const skuParam =
                parsed.searchParams.get('sku') ||
                parsed.searchParams.get('code') ||
                parsed.searchParams.get('productId') ||
                parsed.searchParams.get('id');

            if (skuParam && skuParam.length <= 20) {
                return skuParam;
            }

            const dpMatch = parsed.pathname.match(/\/(?:dp|product|p|item)\/([A-Za-z0-9_-]{3,20})/i);
            if (dpMatch && dpMatch[1]) {
                return dpMatch[1];
            }
        } catch {
            // ignore malformed URL
        }

        return undefined;
    }
}
