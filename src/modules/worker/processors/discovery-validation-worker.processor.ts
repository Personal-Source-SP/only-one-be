import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { DiscoveryValidationService } from '../../data-provider/services/discovery-validation.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryValidationJob } from '../../queue/interfaces';

export type DiscoveryValidationJobType = Job<IDiscoveryValidationJob>;

@Processor(QUEUE_NAME.DISCOVERY_VALIDATION_JOB)
@Injectable()
export class DiscoveryValidationWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoveryValidationWorkerProcessor.name);

    constructor(private readonly discoveryValidationService: DiscoveryValidationService) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 5 })
    async process(job: DiscoveryValidationJobType): Promise<void> {
        const { urlId, sessionId, batchId } = job.data;
        this.loggerService.log(
            `Processing validation job ${job.id} for URL ${urlId} (Batch: ${batchId}, Session: ${sessionId})`,
        );

        try {
            await this.discoveryValidationService.validateUrlForBatch(job.data);
            this.loggerService.log(`Successfully validated discovery URL ${urlId}`);
        } catch (error) {
            this.loggerService.error(`Failed to validate discovery URL ${urlId}: ${error?.message}`);
            throw error;
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoveryValidationJobType): Promise<void> {
        this.loggerService.log(`Discovery validation job ${job.id} for URL ${job.data.urlId} completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoveryValidationJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery validation job ${job.id} failed: ${err?.message}`);
    }
}
