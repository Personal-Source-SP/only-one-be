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
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { ItemDto } from '../dtos/item.dto';
import { IngestDiscoveredUrlResponseDto, IngestDiscoveryUrlResponseDto } from '../dtos/responses';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
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
        @Inject(forwardRef(() => DiscoverySessionService))
        private readonly discoverySessionService: DiscoverySessionService,
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

        const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
        const name = urlEntity.title?.trim() || urlEntity.url;

        let item: ItemDto = null;
        let isNewItem = false;

        // Step 1: Check by code
        if (code) {
            item = await this.itemService.findOneByFilter({ code });
        }

        // Step 2: Fallback to name
        if (!item && name) {
            item = await this.itemService.findOneByFilter({ name });
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
                totalProcessed: 0,
                totalQueued: 0,
                sessionId,
                itemsCreated: 0,
                itemsReused: 0,
                dataProviderItemsCreated: 0,
            });
        }

        const targetUrlIds = urls.map((u) => u.id);
        await this.discoveryUrlRepository.update({ id: In(targetUrlIds) }, { status: DiscoveryUrlStatus.QUEUED });

        const jobs = urls.map((u) => ({
            data: {
                urlId: u.id,
                sessionId: u.sessionId,
                dataProviderId: u.dataProviderId,
            },
            opts: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
            },
        }));

        await this.queueService.addBulkJob(QUEUE_NAME.DISCOVERY_INGESTION_JOB, jobs);

        return new IngestDiscoveryUrlResponseDto({
            totalProcessed: urls.length,
            totalQueued: urls.length,
            sessionId,
            itemsCreated: 0,
            itemsReused: 0,
            dataProviderItemsCreated: 0,
        });
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

        const log = this.discoveryValidationLogService.createValidationLog({
            isLatestLog: true,
            operationStatus: ValidationOperationStatus.COMPLETED,
            discoveryUrlId: urlDto.id,
            sessionId: urlDto.sessionId,
            matchResult: evalResult.matchResult,
            confidenceScore: evalResult.confidenceScore,
            reason: `Revalidation: ${evalResult.reason}`,
            matchedCriteria: evalResult.matchedCriteria,
            processingDuration: Date.now() - startTime,
        });

        await this.dataSource.transaction(async (manager) => {
            await manager.update(DiscoveryUrlEntity, urlId, {
                matchResult: evalResult.matchResult,
                confidenceScore: evalResult.confidenceScore,
                validationStatus: DiscoveryValidationStatus.COMPLETED,
            });
            await manager.save(DiscoveryValidationLogEntity, log);
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
            for (const urlId of urlIds) {
                try {
                    await this.ingestDiscoveredUrl(urlId);
                } catch (err) {
                    this.loggerService.warn(
                        `[submitBulkUserActions] Failed to ingest discovered URL with id: ${urlId} error: ${err?.message}`,
                    );
                }
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
