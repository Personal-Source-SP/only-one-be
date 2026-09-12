import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { RecordAuditLogDto } from '../../audit-log/dtos/requests/record-audit-log.dto';
import { AuditAction, AuditResource, AuditStatus, AUDIT_LOG_EVENTS } from '../../audit-log/enums/audit-log.enum';
import { DiscoveryUrlService } from '../../data-provider/services/discovery-url.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryValidationJob } from '../../queue/interfaces';

export type DiscoveryValidationJobType = Job<IDiscoveryValidationJob>;

@Processor(QUEUE_NAME.DISCOVERY_VALIDATION_JOB)
@Injectable()
export class DiscoveryValidationWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoveryValidationWorkerProcessor.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly discoveryUrlService: DiscoveryUrlService,
    ) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 5 })
    async process(job: DiscoveryValidationJobType): Promise<void> {
        const { urlId, sessionId, targetKeyword } = job.data;
        await this.discoveryUrlService.processDiscoveryValidation(sessionId, urlId, targetKeyword);
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
