import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { RecordAuditLogDto } from '../../audit-log/dtos/requests/record-audit-log.dto';
import { AuditAction, AuditResource, AuditStatus, AUDIT_LOG_EVENTS } from '../../audit-log/enums/audit-log.enum';
import { DiscoverySessionService } from '../../data-provider/services/discovery-session.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoverySearchJob } from '../../queue/interfaces';

export type DiscoverySearchJobType = Job<IDiscoverySearchJob>;

@Processor(QUEUE_NAME.DISCOVERY_SEARCH_JOB)
@Injectable()
export class DiscoverySearchWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoverySearchWorkerProcessor.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly discoverySessionService: DiscoverySessionService,
    ) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 3 })
    async process(job: DiscoverySearchJobType): Promise<void> {
        const { sessionId, keyword } = job.data;
        this.loggerService.log(`Processing discovery search job ${job.id} for keyword "${keyword}" (Session: ${sessionId})`);

        try {
            await this.discoverySessionService.processDiscoverySearch(sessionId, keyword);
            this.loggerService.log(`Successfully completed discovery search job for keyword "${keyword}"`);
        } catch (error) {
            this.loggerService.error(`Failed discovery search job for keyword "${keyword}": ${error?.message}`);
            throw error;
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoverySearchJobType): Promise<void> {
        this.loggerService.log(`Discovery search job ${job.id} for keyword "${job.data.keyword}" completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoverySearchJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery search job ${job.id} failed: ${err?.message}`);

        this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, {
            errorMessage: err?.message,
            status: AuditStatus.FAILED,
            action: AuditAction.RUN_JOB,
            resourceId: job.data.sessionId,
            resource: AuditResource.DATA_PROVIDER,
            deduplicationKey: `audit_fail_${QUEUE_NAME.DISCOVERY_SEARCH_JOB}_${job.id}_${job.attemptsMade}`,
            metadata: {
                stack: err?.stack,
                jobId: job.id,
                keyword: job.data.keyword,
                sessionId: job.data.sessionId,
                attemptsMade: job.attemptsMade,
                queueName: QUEUE_NAME.DISCOVERY_SEARCH_JOB,
            },
        } as RecordAuditLogDto);
    }
}
