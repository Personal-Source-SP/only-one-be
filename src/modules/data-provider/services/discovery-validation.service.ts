import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { LoggerService } from '../../../shared/services/logger.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryValidationJob } from '../../queue/interfaces';
import { QueueService } from '../../queue/services/queue.service';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationBatchDto } from '../dtos/discovery-validation-batch.dto';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationBatchEntity } from '../entities/discovery-validation-batch.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
import {
    DiscoveryValidationStatus,
    FinalValidationStatus,
    ValidationBatchStatus,
    ValidationMatchResult,
    ValidationUserAction,
} from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';
import { DiscoveryUrlService } from './discovery-url.service';

@Injectable()
export class DiscoveryValidationService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly queueService: QueueService,
        private readonly loggerService: LoggerService,
        @Inject(forwardRef(() => DiscoveryUrlService))
        private readonly discoveryUrlService: DiscoveryUrlService,
        @InjectMapper() private readonly mapper: Mapper,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly discoverySessionRepository: Repository<DiscoverySessionEntity>,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly discoveryValidationLogRepository: Repository<DiscoveryValidationLogEntity>,
        @InjectRepository(DiscoveryValidationBatchEntity)
        private readonly discoveryValidationBatchRepository: Repository<DiscoveryValidationBatchEntity>,
    ) {}

    async startBatchValidation(sessionId: string, targetKeyword?: string): Promise<DiscoveryValidationBatchDto> {
        const session = await this.discoverySessionRepository.findOne({
            where: { id: sessionId },
            relations: ['dataProvider'],
        });
        if (!session) throw new NotFoundException('Discovery session not found');

        const urls = await this.discoveryUrlRepository.find({ where: { sessionId } });
        if (!urls.length) throw new BadRequestException('No discovered URLs found for session');

        const batchNumber = `BATCH-${Date.now()}`;
        const batch = this.discoveryValidationBatchRepository.create({
            sessionId,
            batchNumber,
            matchedUrls: 0,
            noMatchUrls: 0,
            processedUrls: 0,
            startedAt: new Date(),
            totalUrls: urls.length,
            status: ValidationBatchStatus.PROCESSING,
        });
        await this.discoveryValidationBatchRepository.save(batch);

        // Mark existing logs as not latest
        await this.discoveryValidationLogRepository.update({ sessionId }, { isLatestLog: false });

        // Enqueue bulk jobs into Redis queue
        const jobs = urls.map((u) => ({
            data: {
                sessionId,
                targetKeyword,
                urlId: u.id,
                batchId: batch.id,
            } as IDiscoveryValidationJob,
            opts: {
                attempts: 3,
                removeOnComplete: true,
                backoff: { type: 'exponential', delay: 1000 },
            },
        }));

        const result = await this.queueService.addBulkJob(QUEUE_NAME.DISCOVERY_VALIDATION_JOB, jobs);
        if (!result) {
            this.loggerService.warn('[startBatchValidation] Failed to add jobs to queue');
            throw new InternalServerErrorException('Failed to add jobs to queue');
        }

        return this.mapper.map(batch, DiscoveryValidationBatchEntity, DiscoveryValidationBatchDto);
    }

    async cancelValidationBatch(batchId: string, reason?: string): Promise<boolean> {
        const batch = await this.discoveryValidationBatchRepository.findOne({ where: { id: batchId } });
        if (!batch) throw new NotFoundException('Validation batch not found');

        if ([ValidationBatchStatus.COMPLETED, ValidationBatchStatus.CANCELLED].includes(batch.status)) {
            throw new BadRequestException('Batch is already finished or cancelled');
        }

        const result = await this.discoveryValidationBatchRepository.update(batchId, {
            reasonCancelled: reason,
            status: ValidationBatchStatus.CANCELLED,
        });

        return result.affected > 0;
    }

    async revalidateDiscoveredUrl(urlId: string, targetKeyword?: string): Promise<DiscoveryUrlDto> {
        const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
        if (!urlEntity) throw new NotFoundException('Discovered URL not found');

        const startTime = Date.now();
        const evalResult = DiscoveryValidationHelper.evaluateUrl({
            targetKeyword,
            url: urlEntity.url,
            title: urlEntity.title,
            domain: urlEntity.domain,
        });

        urlEntity.matchResult = evalResult.matchResult;
        urlEntity.confidenceScore = evalResult.confidenceScore;
        urlEntity.validationStatus = DiscoveryValidationStatus.COMPLETED;

        await this.discoveryValidationLogRepository.update({ discoveryUrlId: urlId }, { isLatestLog: false });

        const log = this.discoveryValidationLogRepository.create({
            isLatestLog: true,
            operationStatus: 'completed',
            discoveryUrlId: urlEntity.id,
            sessionId: urlEntity.sessionId,
            validationBatchId: urlEntity.sessionId, // Fallback if single
            matchResult: evalResult.matchResult,
            confidenceScore: evalResult.confidenceScore,
            reason: `Revalidation: ${evalResult.reason}`,
            matchedCriteria: evalResult.matchedCriteria,
            processingDuration: Date.now() - startTime,
        });

        await this.dataSource.transaction(async (manager) => {
            await manager.save(DiscoveryUrlEntity, urlEntity);
            await manager.save(DiscoveryValidationLogEntity, log);
        });

        return this.mapper.map(urlEntity, DiscoveryUrlEntity, DiscoveryUrlDto);
    }

    async submitUserAction(urlId: string, action: ValidationUserAction, reason?: string): Promise<boolean> {
        const finalStatus = action === ValidationUserAction.CONFIRM ? FinalValidationStatus.APPROVED : FinalValidationStatus.REJECTED;

        const result = await this.discoveryUrlRepository.update(urlId, {
            userAction: action,
            userActionReason: reason,
            userActionDate: new Date(),
            finalValidationStatus: finalStatus,
        });

        if (action === ValidationUserAction.CONFIRM) {
            await this.discoveryUrlService.ingestDiscoveredUrl(urlId);
        }

        return (result.affected ?? 0) > 0;
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
                    await this.discoveryUrlService.ingestDiscoveredUrl(urlId);
                } catch (err) {
                    this.loggerService.warn(
                        `[submitBulkUserActions] Failed to ingest discovered URL with id: ${urlId} error: ${err?.message}`,
                    );
                }
            }
        }

        return (result.affected ?? 0) > 0;
    }

    async validateUrlForBatch(jobData: IDiscoveryValidationJob): Promise<void> {
        const { urlId, sessionId, batchId, targetKeyword } = jobData;
        const startTime = Date.now();

        const batch = await this.discoveryValidationBatchRepository.findOne({ where: { id: batchId } });
        if (!batch || batch.status === ValidationBatchStatus.CANCELLED) {
            this.loggerService.warn(`[validateUrlForBatch] Skipping validation: Batch ${batchId} not found or cancelled`);
            return;
        }

        const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
        if (!urlEntity) {
            this.loggerService.warn(`[validateUrlForBatch] Skipping validation: Discovery URL ${urlId} not found`);
            return;
        }

        const evalResult = DiscoveryValidationHelper.evaluateUrl({
            targetKeyword,
            url: urlEntity.url,
            title: urlEntity.title,
            domain: urlEntity.domain,
        });

        const isMatched =
            evalResult.matchResult === ValidationMatchResult.EXACT_MATCH ||
            evalResult.matchResult === ValidationMatchResult.PARTIAL_MATCH;

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

    async getLatestValidationBatch(sessionId: string): Promise<DiscoveryValidationBatchDto | null> {
        const batch = await this.discoveryValidationBatchRepository.findOne({
            where: { sessionId },
            order: { createdAt: 'DESC' },
        });
        if (!batch) return null;

        return this.mapper.map(batch, DiscoveryValidationBatchEntity, DiscoveryValidationBatchDto);
    }
}
