import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';

import { CustomError } from '../../../exceptions/custom-error.exception';
import { UtilsService } from '../../../shared/services/utils.service';
import { ProcessScrapeDataRequestDto } from '../../data-provider/dtos/requests';
import { ProcessScrapeDataResponse } from '../../data-provider/dtos/responses';
import { DataHistoryService } from '../../data-provider/services/data-history.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { ScheduleJobEventType, ScheduleJobType } from '../../schedule/enums';
import { ScheduleJobEventService } from '../../schedule/services/schedule-job-event.service';
import { SCRAPING_WORKER_MESSAGE } from '../constants/message';

export type ScrapingWorkerProcessorType = Job<{
    jobId: string;
    request: ProcessScrapeDataRequestDto;
}>;

@Processor(QUEUE_NAME.SCRAPING_JOB)
@Injectable()
export class ScrapingWorkerProcessor {
    private readonly workerProcessName: string;
    private readonly logger = new Logger(ScrapingWorkerProcessor.name);

    constructor(
        private readonly dataHistoryService: DataHistoryService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
    ) {
        this.workerProcessName = (global as any).WORKER_PROCESS_NAME || 'UnknownWorker';
        this.logger.log(`[${this.workerProcessName}] initialized`);
    }

    @Process()
    async process(job: ScrapingWorkerProcessorType): Promise<ProcessScrapeDataResponse> {
        this.logger.log(`[${this.workerProcessName}] Starting job ${job.id}, attempts: ${job.attemptsMade}`);

        if (!job.attemptsMade) {
            await this.updateScheduleJobEvent(job, ScheduleJobEventType.PROCESSING);
        }

        this.logger.log(`[${this.workerProcessName}] Processing job ${job.id}`);

        try {
            const data = job.data.request;
            const scrapingData = await this.dataHistoryService.processScrapeData(data);

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
        this.logger.log(`[${this.workerProcessName}] Job ${job.id} completed. Scraping data: ${scrapingData}`);
        await this.updateScheduleJobEvent(job, ScheduleJobEventType.COMPLETED);
    }

    @OnQueueFailed()
    async onError(job: ScrapingWorkerProcessorType, err: Error): Promise<void> {
        const scrapingJobId = job.id;
        const meta = err instanceof CustomError ? err.data : { name: err?.name, stack: err?.stack };

        this.logger.error(`[${this.workerProcessName}] Job ${scrapingJobId} failed. Error: ${err?.message}`, meta);

        if (job.attemptsMade >= job.opts.attempts) {
            await this.updateScheduleJobEvent(job, ScheduleJobEventType.FAILED);
        }
    }

    private async updateScheduleJobEvent(job: ScrapingWorkerProcessorType, status: ScheduleJobEventType): Promise<boolean> {
        const scrapingJobEventId = job.id.toString();

        switch (status) {
            case ScheduleJobEventType.PROCESSING:
                return await this.scheduleJobEventService.update(scrapingJobEventId, {
                    startedAt: UtilsService.getUtcNow(),
                    eventType: ScheduleJobEventType.PROCESSING,
                    eventMessage: 'Scraping worker started',
                });

            case ScheduleJobEventType.COMPLETED:
                return await this.scheduleJobEventService.update(scrapingJobEventId, {
                    retryCount: job.attemptsMade,
                    finishedAt: UtilsService.getUtcNow(),
                    status: ScheduleJobType.COMPLETED,
                });

            case ScheduleJobEventType.FAILED:
                return await this.scheduleJobEventService.update(scrapingJobEventId, {
                    retryCount: job.attemptsMade,
                    errorMessage: job.failedReason,
                    status: ScheduleJobType.FAILED,
                });
        }
    }
}
