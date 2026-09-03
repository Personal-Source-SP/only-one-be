import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { LoggerService } from '../../../shared/services/logger.service';
import { DiscoverySessionEntity } from '../../data-provider/entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../../data-provider/entities/discovery-url.entity';
import { DiscoveryValidationBatchEntity } from '../../data-provider/entities/discovery-validation-batch.entity';
import { DiscoveryValidationLogEntity } from '../../data-provider/entities/discovery-validation-log.entity';
import { DiscoveryValidationStatus, ValidationBatchStatus, ValidationMatchResult } from '../../data-provider/enums';
import { DiscoveryValidationHelper } from '../../data-provider/helpers/discovery-validation.helper';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryValidationJob } from '../../queue/interfaces';

export type DiscoveryValidationJobType = Job<IDiscoveryValidationJob>;

@Processor(QUEUE_NAME.DISCOVERY_VALIDATION_JOB)
@Injectable()
export class DiscoveryValidationWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoveryValidationWorkerProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly urlRepo: Repository<DiscoveryUrlEntity>,
        @InjectRepository(DiscoveryValidationBatchEntity)
        private readonly batchRepo: Repository<DiscoveryValidationBatchEntity>,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly logRepo: Repository<DiscoveryValidationLogEntity>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepo: Repository<DiscoverySessionEntity>,
    ) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 5 })
    async process(job: DiscoveryValidationJobType): Promise<void> {
        const { urlId, sessionId, batchId, targetKeyword } = job.data;
        const startTime = Date.now();

        const batch = await this.batchRepo.findOne({ where: { id: batchId } });
        if (!batch || batch.status === ValidationBatchStatus.CANCELLED) {
            this.loggerService.warn(`Skipping job ${job.id}: Batch ${batchId} not found or cancelled`);
            return;
        }

        const urlEntity = await this.urlRepo.findOne({ where: { id: urlId } });
        if (!urlEntity) {
            this.loggerService.warn(`Skipping job ${job.id}: Discovery URL ${urlId} not found`);
            return;
        }

        const evalResult = DiscoveryValidationHelper.evaluateUrl({
            targetKeyword,
            url: urlEntity.url,
            title: urlEntity.title,
            domain: urlEntity.domain,
        });

        const isMatched =
            evalResult.matchResult === ValidationMatchResult.EXACT_MATCH || evalResult.matchResult === ValidationMatchResult.PARTIAL_MATCH;

        await this.dataSource.transaction(async (manager) => {
            await manager.update(DiscoveryUrlEntity, urlId, {
                matchResult: evalResult.matchResult,
                confidenceScore: evalResult.confidenceScore,
                validationStatus: DiscoveryValidationStatus.COMPLETED,
            });

            await manager.save(
                DiscoveryValidationLogEntity,
                manager.create(DiscoveryValidationLogEntity, {
                    sessionId,
                    isLatestLog: true,
                    validationBatchId: batchId,
                    discoveryUrlId: urlId,
                    operationStatus: 'completed',
                    reason: evalResult.reason,
                    matchResult: evalResult.matchResult,
                    confidenceScore: evalResult.confidenceScore,
                    matchedCriteria: evalResult.matchedCriteria,
                    processingDuration: Date.now() - startTime,
                }),
            );

            await this.incrementBatchProgress(manager, batchId, isMatched);

            const updatedBatch = await manager.findOne(DiscoveryValidationBatchEntity, { where: { id: batchId } });
            if (updatedBatch && updatedBatch.processedUrls >= updatedBatch.totalUrls) {
                await manager.update(DiscoveryValidationBatchEntity, batchId, {
                    status: ValidationBatchStatus.COMPLETED,
                    completedAt: new Date(),
                });
                await manager.update(DiscoverySessionEntity, sessionId, {
                    totalValidated: updatedBatch.processedUrls,
                });
            }
        });
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoveryValidationJobType): Promise<void> {
        this.loggerService.log(`Discovery validation job ${job.id} for URL ${job.data.urlId} completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoveryValidationJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery validation job ${job.id} failed: ${err?.message}`);
    }

    private async incrementBatchProgress(manager: EntityManager, batchId: string, isMatched: boolean): Promise<void> {
        await manager
            .createQueryBuilder()
            .update(DiscoveryValidationBatchEntity)
            .set({
                processedUrls: () => 'processed_urls + 1',
                matchedUrls: () => (isMatched ? 'matched_urls + 1' : 'matched_urls'),
                noMatchUrls: () => (!isMatched ? 'no_match_urls + 1' : 'no_match_urls'),
            })
            .where('id = :batchId', { batchId })
            .execute();
    }
}
