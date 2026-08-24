import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { CustomError } from '../../../exceptions/custom-error.exception';
import { LoggerService } from '../../../shared/services/logger.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { ProcessSearchDataResponse } from '../../data-provider/dtos/responses';
import { DraftItemService } from '../../data-provider/services/draft-item.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { ISearchJobQueueInterface } from '../../queue/interfaces';
import { ScheduleJobEventType } from '../../schedule/enums';
import { ScheduleJobEventService } from '../../schedule/services/schedule-job-event.service';
import { SEARCH_WORKER_MESSAGE } from '../constants/message';

export type SearchWorkerProcessorType = Job<ISearchJobQueueInterface>;

@Processor(QUEUE_NAME.SEARCH_JOB)
@Injectable()
export class SearchWorkerProcessor {
    private readonly workerProcessName: string;
    private readonly loggerService: LoggerService = new LoggerService(SearchWorkerProcessor.name);

    constructor(
        private readonly draftItemService: DraftItemService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
    ) {
        this.workerProcessName = (global as any).WORKER_PROCESS_NAME || 'UnknownWorker';
        this.loggerService.log('SearchWorkerProcessor Initialized');
    }

    @Process()
    async process(job: SearchWorkerProcessorType): Promise<ProcessSearchDataResponse> {
        this.loggerService.log(`Starting search job ${job.id}, attempts: ${job.attemptsMade}`);

        if (!job.attemptsMade) {
            await this.updateScheduleJobEvent(job, ScheduleJobEventType.PROCESSING);
        }

        try {
            const data = job.data.request;
            const searchData = await this.draftItemService.processSearchData(data);

            if (!searchData) {
                throw new CustomError(SEARCH_WORKER_MESSAGE.FAILED_TO_PROCESS_SEARCH_DATA);
            }

            return searchData;
        } catch (error) {
            throw new CustomError(error?.message, error?.data);
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: SearchWorkerProcessorType, searchData: ProcessSearchDataResponse): Promise<void> {
        this.loggerService.log(`Search job ${job.data.scheduleJobEventId} completed. Created drafts: ${searchData?.totalDraftsCreated}`);
        await this.updateScheduleJobEvent(job, ScheduleJobEventType.COMPLETED, searchData);
    }

    @OnQueueFailed()
    async onError(job: SearchWorkerProcessorType, err: Error): Promise<void> {
        const searchJobEventId = job.data.scheduleJobEventId;
        this.loggerService.error(`Search job ${searchJobEventId} failed. Error: ${err?.message}`);

        if (job.attemptsMade >= (job.opts?.attempts || 1)) {
            await this.updateScheduleJobEvent(job, ScheduleJobEventType.FAILED);
        }
    }

    private async updateScheduleJobEvent(
        job: SearchWorkerProcessorType,
        status: ScheduleJobEventType,
        searchData?: ProcessSearchDataResponse,
    ): Promise<boolean> {
        const searchJobEventId = job.data.scheduleJobEventId;

        switch (status) {
            case ScheduleJobEventType.PROCESSING:
                return await this.scheduleJobEventService.update(searchJobEventId, {
                    startedAt: UtilsService.getUtcNow(),
                    eventType: ScheduleJobEventType.PROCESSING,
                    eventMessage: 'Search discovery worker started',
                });

            case ScheduleJobEventType.COMPLETED:
                return await this.scheduleJobEventService.update(searchJobEventId, {
                    metaData: searchData,
                    retryCount: job.attemptsMade,
                    finishedAt: UtilsService.getUtcNow(),
                    eventType: ScheduleJobEventType.COMPLETED,
                    eventMessage: `Search discovery worker completed. Created ${searchData?.totalDraftsCreated || 0} drafts`,
                });

            case ScheduleJobEventType.FAILED:
                return await this.scheduleJobEventService.update(searchJobEventId, {
                    retryCount: job.attemptsMade,
                    eventType: ScheduleJobEventType.FAILED,
                    eventMessage: job.failedReason || 'Search discovery worker failed',
                });
        }
    }
}
