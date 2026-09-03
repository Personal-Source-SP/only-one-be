import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { Repository } from 'typeorm';

import { LoggerService } from '../../../shared/services/logger.service';
import { DiscoveryUrlEntity } from '../../data-provider/entities/discovery-url.entity';
import { DiscoveryUrlStatus } from '../../data-provider/enums';
import { DiscoveryUrlService } from '../../data-provider/services/discovery-url.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryIngestionJob } from '../../queue/interfaces';

export type DiscoveryIngestionJobType = Job<IDiscoveryIngestionJob>;

@Processor(QUEUE_NAME.DISCOVERY_INGESTION_JOB)
@Injectable()
export class DiscoveryIngestionWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoveryIngestionWorkerProcessor.name);

    constructor(
        private readonly discoveryUrlService: DiscoveryUrlService,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
    ) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 5 })
    async process(job: DiscoveryIngestionJobType): Promise<void> {
        const { urlId, sessionId } = job.data;
        this.loggerService.log(`Processing ingestion job ${job.id} for URL ${urlId} (Session: ${sessionId})`);

        const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
        if (!urlEntity) {
            this.loggerService.warn(`Skipping job ${job.id}: Discovery URL ${urlId} not found`);
            return;
        }

        try {
            await this.discoveryUrlService.ingestDiscoveredUrl(urlId);
            this.loggerService.log(`Successfully ingested discovery URL ${urlId}`);
        } catch (error) {
            this.loggerService.error(`Failed to ingest discovery URL ${urlId}: ${error?.message}`);
            await this.discoveryUrlRepository.update(urlId, { status: DiscoveryUrlStatus.FAILED });

            throw error;
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoveryIngestionJobType): Promise<void> {
        this.loggerService.log(`Discovery ingestion job ${job.id} for URL ${job.data.urlId} completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoveryIngestionJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery ingestion job ${job.id} failed: ${err?.message}`);
    }
}
