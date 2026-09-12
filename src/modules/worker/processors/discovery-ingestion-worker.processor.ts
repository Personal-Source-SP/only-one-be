import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { DiscoveryUrlStatus } from '../../data-provider/enums';
import { DiscoveryUrlService } from '../../data-provider/services/discovery-url.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryIngestionJob } from '../../queue/interfaces';

export type DiscoveryIngestionJobType = Job<IDiscoveryIngestionJob>;

@Processor(QUEUE_NAME.DISCOVERY_INGESTION_JOB)
@Injectable()
export class DiscoveryIngestionWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoveryIngestionWorkerProcessor.name);

    constructor(private readonly discoveryUrlService: DiscoveryUrlService) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 5 })
    async process(job: DiscoveryIngestionJobType): Promise<void> {
        const { urlIds, sessionId } = job.data;
        this.loggerService.log(`Processing ingestion job ${job.id} for ${urlIds.length} URL(s) (Session: ${sessionId})`);

        try {
            await this.discoveryUrlService.ingestDiscoveredUrlsChunk(urlIds);
            this.loggerService.log(`Successfully ingested ${urlIds.length} discovery URLs in job ${job.id}`);
        } catch (error) {
            this.loggerService.error(`Failed to ingest discovery URLs in job ${job.id}: ${error?.message}`);
            if (urlIds?.length > 0) {
                await this.discoveryUrlService.updateStatus(urlIds, DiscoveryUrlStatus.FAILED);
            }

            throw error;
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoveryIngestionJobType): Promise<void> {
        this.loggerService.log(`Discovery ingestion job ${job.id} for ${job.data.urlIds?.length || 0} URL(s) completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoveryIngestionJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery ingestion job ${job.id} failed: ${err?.message}`);
    }
}
