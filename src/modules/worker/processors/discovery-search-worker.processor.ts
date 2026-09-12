import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { DiscoverySessionService } from '../../data-provider/services/discovery-session.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoverySearchJob } from '../../queue/interfaces';

export type DiscoverySearchJobType = Job<IDiscoverySearchJob>;

@Processor(QUEUE_NAME.DISCOVERY_SEARCH_JOB)
@Injectable()
export class DiscoverySearchWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoverySearchWorkerProcessor.name);

    constructor(private readonly discoverySessionService: DiscoverySessionService) {
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
    }
}
