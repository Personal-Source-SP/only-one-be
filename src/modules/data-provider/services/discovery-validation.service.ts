import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

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
import { DiscoveryValidationStatus, FinalValidationStatus, ValidationBatchStatus, ValidationUserAction } from '../enums';
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
        private readonly urlRepo: Repository<DiscoveryUrlEntity>,
        @InjectRepository(DiscoveryValidationBatchEntity)
        private readonly batchRepo: Repository<DiscoveryValidationBatchEntity>,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly logRepo: Repository<DiscoveryValidationLogEntity>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepo: Repository<DiscoverySessionEntity>,
    ) {}

    async startBatchValidation(sessionId: string, targetKeyword?: string): Promise<DiscoveryValidationBatchDto> {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
            relations: ['dataProvider'],
        });
        if (!session) throw new NotFoundException('Discovery session not found');

        const urls = await this.urlRepo.find({ where: { sessionId } });
        if (!urls.length) throw new BadRequestException('No discovered URLs found for session');

        const batchNumber = `BATCH-${Date.now()}`;
        const batch = this.batchRepo.create({
            sessionId,
            batchNumber,
            matchedUrls: 0,
            noMatchUrls: 0,
            processedUrls: 0,
            startedAt: new Date(),
            totalUrls: urls.length,
            status: ValidationBatchStatus.PROCESSING,
        });
        await this.batchRepo.save(batch);

        // Mark existing logs as not latest
        await this.logRepo.update({ sessionId }, { isLatestLog: false });

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
        const batch = await this.batchRepo.findOne({ where: { id: batchId } });
        if (!batch) throw new NotFoundException('Validation batch not found');

        if ([ValidationBatchStatus.COMPLETED, ValidationBatchStatus.CANCELLED].includes(batch.status)) {
            throw new BadRequestException('Batch is already finished or cancelled');
        }

        const result = await this.batchRepo.update(batchId, {
            reasonCancelled: reason,
            status: ValidationBatchStatus.CANCELLED,
        });

        return result.affected > 0;
    }

    async revalidateDiscoveredUrl(urlId: string, targetKeyword?: string): Promise<DiscoveryUrlDto> {
        const urlEntity = await this.urlRepo.findOne({ where: { id: urlId } });
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

        await this.logRepo.update({ discoveryUrlId: urlId }, { isLatestLog: false });

        const log = this.logRepo.create({
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

        const result = await this.urlRepo.update(urlId, {
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

        const result = await this.urlRepo.update(
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

    async getLatestValidationBatch(sessionId: string): Promise<DiscoveryValidationBatchDto | null> {
        const batch = await this.batchRepo.findOne({
            where: { sessionId },
            order: { createdAt: 'DESC' },
        });
        if (!batch) return null;

        return this.mapper.map(batch, DiscoveryValidationBatchEntity, DiscoveryValidationBatchDto);
    }
}
