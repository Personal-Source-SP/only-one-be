import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { CustomError } from '../../../exceptions/custom-error.exception';
import { LoggerService } from '../../../shared/services/logger.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { ProcessScrapeDataResponse } from '../../data-provider/dtos/responses';
import { ScrapingDataService } from '../../data-provider/services/scraping-data.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IScrapingJobQueueInterface } from '../../queue/interfaces';
import { ScheduleJobEventType } from '../../schedule/enums';
import { ScheduleJobEventService } from '../../schedule/services/schedule-job-event.service';
import { SCRAPING_WORKER_MESSAGE } from '../constants/message';

export type ScrapingWorkerProcessorType = Job<IScrapingJobQueueInterface>;

@Processor(QUEUE_NAME.SCRAPING_JOB)
@Injectable()
export class ScrapingWorkerProcessor {
    private readonly workerProcessName: string;
    private readonly loggerService: LoggerService = new LoggerService(ScrapingWorkerProcessor.name);

    constructor(
        private readonly scrapingDataService: ScrapingDataService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
    ) {
        this.workerProcessName = (global as any).WORKER_PROCESS_NAME || 'UnknownWorker';
        this.loggerService.log('Initialized');
    }

    @Process()
    async process(job: ScrapingWorkerProcessorType): Promise<ProcessScrapeDataResponse> {
        this.loggerService.log(`Starting job ${job.id}, attempts: ${job.attemptsMade}`);

        if (!job.attemptsMade) {
            await this.updateScheduleJobEvent(job, ScheduleJobEventType.PROCESSING);
        }

        this.loggerService.log(`Processing job ${job.id}`);

        try {
            const data = job.data.request;
            const scrapingData = await this.scrapingDataService.processScrapeData(data);

            if (!scrapingData) {
                throw new CustomError(SCRAPING_WORKER_MESSAGE.FAILED_TO_PROCESS_SCRAPE_DATA);
            }

            return scrapingData;
        } catch (error) {
            throw new CustomError(error?.message, error?.data);
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: ScrapingWorkerProcessorType, scrapingData: ProcessScrapeDataResponse): Promise<void> {
        this.loggerService.log(`Job ${job.data.scheduleJobEventId} completed. Scraping data: ${scrapingData}`);
        await this.updateScheduleJobEvent(job, ScheduleJobEventType.COMPLETED, scrapingData);
    }

    @OnQueueFailed()
    async onError(job: ScrapingWorkerProcessorType, err: Error): Promise<void> {
        const scrapingJobEventId = job.data.scheduleJobEventId;
        const meta = err instanceof CustomError ? err.data : { name: err?.name, stack: err?.stack };

        this.loggerService.error(`Job ${scrapingJobEventId} failed. Error: ${err?.message}`);

        if (job.attemptsMade >= job.opts.attempts) {
            await this.updateScheduleJobEvent(job, ScheduleJobEventType.FAILED);
        }
    }

    private async updateScheduleJobEvent(
        job: ScrapingWorkerProcessorType,
        status: ScheduleJobEventType,
        scrapingData?: ProcessScrapeDataResponse,
    ): Promise<boolean> {
        const scrapingJobEventId = job.data.scheduleJobEventId;

        switch (status) {
            case ScheduleJobEventType.PROCESSING:
                return await this.scheduleJobEventService.update(scrapingJobEventId, {
                    startedAt: UtilsService.getUtcNow(),
                    eventType: ScheduleJobEventType.PROCESSING,
                    eventMessage: 'Scraping worker started',
                });

            case ScheduleJobEventType.COMPLETED:
                return await this.scheduleJobEventService.update(scrapingJobEventId, {
                    metaData: scrapingData,
                    retryCount: job.attemptsMade,
                    finishedAt: UtilsService.getUtcNow(),
                    eventType: ScheduleJobEventType.COMPLETED,
                    eventMessage: 'Scraping worker completed',
                });

            case ScheduleJobEventType.FAILED:
                return await this.scheduleJobEventService.update(scrapingJobEventId, {
                    retryCount: job.attemptsMade,
                    errorMessage: job.failedReason,
                    eventType: ScheduleJobEventType.FAILED,
                });
        }
    }
}
