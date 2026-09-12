import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bull';
import { DataSource, EntityManager } from 'typeorm';

import { LoggerService } from '../../../shared/services/logger.service';
import { RecordAuditLogDto } from '../../audit-log/dtos/requests/record-audit-log.dto';
import { AuditAction, AuditResource, AuditStatus, AUDIT_LOG_EVENTS } from '../../audit-log/enums/audit-log.enum';
import { DiscoverySessionEntity } from '../../data-provider/entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../../data-provider/entities/discovery-url.entity';
import { DiscoveryValidationLogEntity } from '../../data-provider/entities/discovery-validation-log.entity';
import {
    DiscoveryValidationStatus,
    ValidationBatchStatus,
    ValidationMatchResult,
    ValidationOperationStatus,
} from '../../data-provider/enums';
import { DiscoveryValidationHelper } from '../../data-provider/helpers/discovery-validation.helper';
import { DiscoverySessionService } from '../../data-provider/services/discovery-session.service';
import { DiscoveryUrlService } from '../../data-provider/services/discovery-url.service';
import { DiscoveryValidationLogService } from '../../data-provider/services/discovery-validation-log.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryValidationJob } from '../../queue/interfaces';

export type DiscoveryValidationJobType = Job<IDiscoveryValidationJob>;

@Processor(QUEUE_NAME.DISCOVERY_VALIDATION_JOB)
@Injectable()
export class DiscoveryValidationWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoveryValidationWorkerProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly eventEmitter: EventEmitter2,
        private readonly discoveryUrlService: DiscoveryUrlService,
        private readonly discoverySessionService: DiscoverySessionService,
        private readonly discoveryValidationLogService: DiscoveryValidationLogService,
    ) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 5 })
    async process(job: DiscoveryValidationJobType): Promise<void> {
        const { urlId, sessionId, targetKeyword } = job.data;

        const startTime = Date.now();
        this.loggerService.log(`Processing validation job ${job.id} for URL ${urlId} (Session: ${sessionId})`);

        const session = await this.discoverySessionService.findById(sessionId);
        if (!session || session.validationStatus === ValidationBatchStatus.CANCELLED) {
            this.loggerService.warn(`Validation skipped: session ${sessionId} not found or cancelled`);
            return;
        }

        const url = await this.discoveryUrlService.findById(urlId);
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

        const isMatched = [ValidationMatchResult.EXACT_MATCH, ValidationMatchResult.PARTIAL_MATCH].includes(evalResult.matchResult);

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

            await this.incrementValidationProgress(manager, sessionId, isMatched);
            await this.completeValidationIfFinished(manager, sessionId);
        });

        this.loggerService.log(`Successfully validated discovery URL ${urlId}`);
    }

    private async incrementValidationProgress(manager: EntityManager, sessionId: string, isMatched: boolean): Promise<void> {
        await manager
            .createQueryBuilder()
            .update(DiscoverySessionEntity)
            .set({
                totalValidated: () => 'total_validated + 1',
                matchedUrls: () => (isMatched ? 'matched_urls + 1' : 'matched_urls'),
                noMatchUrls: () => (!isMatched ? 'no_match_urls + 1' : 'no_match_urls'),
            })
            .where('id = :sessionId', { sessionId })
            .execute();
    }

    private async completeValidationIfFinished(manager: EntityManager, sessionId: string): Promise<boolean> {
        const session = await manager.findOne(DiscoverySessionEntity, { where: { id: sessionId } });
        if (session && session.totalValidated >= session.totalDiscovered) {
            await manager.update(DiscoverySessionEntity, sessionId, {
                validationStatus: ValidationBatchStatus.COMPLETED,
                validationCompletedAt: new Date(),
            });

            return true;
        }

        return false;
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoveryValidationJobType): Promise<void> {
        this.loggerService.log(`Discovery validation job ${job.id} for URL ${job.data.urlId} completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoveryValidationJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery validation job ${job.id} failed: ${err?.message}`);

        this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, {
            resourceId: job.data.urlId,
            errorMessage: err?.message,
            status: AuditStatus.FAILED,
            action: AuditAction.RUN_JOB,
            resource: AuditResource.DISCOVERY_URL,
            deduplicationKey: `audit_fail_${QUEUE_NAME.DISCOVERY_VALIDATION_JOB}_${job.id}_${job.attemptsMade}`,
            metadata: {
                jobId: job.id,
                urlId: job.data.urlId,
                sessionId: job.data.sessionId,
                attemptsMade: job.attemptsMade,
                targetKeyword: job.data.targetKeyword,
                queueName: QUEUE_NAME.DISCOVERY_VALIDATION_JOB,
                stack: err?.stack,
            },
        } as RecordAuditLogDto);
    }
}
