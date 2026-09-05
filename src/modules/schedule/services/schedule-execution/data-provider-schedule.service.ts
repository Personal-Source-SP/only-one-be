import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';

import { AppException } from '../../../../exceptions/app.exception';
import { LoggerService } from '../../../../shared/services/logger.service';
import { ProcessScrapeDataRequestDto } from '../../../data-provider/dtos/requests';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../../../data-provider/enums';
import { DataProviderService } from '../../../data-provider/services/data-provider.service';
import { QUEUE_NAME } from '../../../queue/enums/queue-name.enum';
import { IScrapingJobQueueInterface } from '../../../queue/interfaces';
import { QueueService } from '../../../queue/services/queue.service';
import { ScheduleError } from '../../constants/schedule-error';
import { PayloadScheduleDto } from '../../dtos/requests';
import { ScheduleJobEventEntity } from '../../entities/schedule-job-event.entity';
import { ScheduleJobEventType, ScheduleType } from '../../enums';
import { IAddJobRequest, IScheduleExecutionInterface } from '../../interfaces';
import { ScheduleJobEventService } from '../schedule-job-event.service';

@Injectable()
export class DataProviderScheduleService implements IScheduleExecutionInterface {
    private readonly loggerService: LoggerService = new LoggerService(DataProviderScheduleService.name);

    constructor(
        private readonly queueService: QueueService,
        private readonly dataProviderService: DataProviderService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
    ) {}

    async addJob(request: IAddJobRequest): Promise<boolean> {
        const { scheduleJobId, scheduleType, jobPayload } = request;

        const jobs = await this.getJobData(scheduleJobId, scheduleType, jobPayload);

        const queues = await this.queueService.addBulkJob(QUEUE_NAME.SCRAPING_JOB, jobs);
        if (!queues.length) {
            this.loggerService.error(`[DataProviderScheduleService] Error adding job to queue: ${scheduleJobId}`);
            throw new AppException(ScheduleError.JobQueueAddFailed);
        }

        return true;
    }

    private async getJobData(
        scheduleJobId: string,
        scheduleType: ScheduleType,
        jobPayload?: PayloadScheduleDto,
    ): Promise<Job<IScrapingJobQueueInterface>[]> {
        const requests: ProcessScrapeDataRequestDto[] = [];

        switch (scheduleType) {
            case ScheduleType.GLOBAL: {
                const dataProviders = await this.dataProviderService.repository
                    .createQueryBuilder('dataProvider')
                    .innerJoin('dataProvider.features', 'feature', 'feature.type = :type AND feature.status = :status', {
                        type: DataProviderFeatureType.SCRAPING,
                        status: DataProviderFeatureStatus.READY,
                    })
                    .leftJoinAndSelect('dataProvider.dataProviderItems', 'dataProviderItem')
                    .where('dataProviderItem.isActive = :isActive', { isActive: true })
                    .getMany();

                if (!dataProviders.length) {
                    this.loggerService.error(`[ScheduleJobService] No data providers available to scrape: ${scheduleType}`);
                    throw new AppException(ScheduleError.NoDataProvidersToScrape);
                }

                for (const dataProvider of dataProviders) {
                    for (const dataProviderItem of dataProvider.dataProviderItems) {
                        requests.push(
                            new ProcessScrapeDataRequestDto({
                                mimeTypes: [],
                                checkDuplicateData: true,
                                lastScrapeTimestamp: new Date(),
                                dataProviderIds: [dataProvider.id],
                                dataProviderItemIds: [dataProviderItem.id],
                            }),
                        );
                    }
                }

                break;
            }

            case ScheduleType.DATA_PROVIDER: {
                if (!jobPayload?.dataProviderIds?.length) {
                    this.loggerService.error(`[ScheduleJobService] No data providers available to scrape: ${scheduleType}`);
                    throw new AppException(ScheduleError.NoDataProvidersToScrape);
                }

                const dataProviderIds = jobPayload?.dataProviderIds || [];
                for (const dataProviderId of dataProviderIds) {
                    requests.push(
                        new ProcessScrapeDataRequestDto({
                            mimeTypes: [],
                            checkDuplicateData: true,
                            lastScrapeTimestamp: new Date(),
                            dataProviderIds: [dataProviderId],
                        }),
                    );
                }

                break;
            }

            case ScheduleType.ITEM: {
                if (!jobPayload?.itemIds?.length) {
                    this.loggerService.error(`[ScheduleJobService] No items available to scrape: ${scheduleType}`);
                    throw new AppException(ScheduleError.NoItemsToScrape);
                }

                const itemIds = jobPayload?.itemIds || [];
                for (const itemId of itemIds) {
                    requests.push(
                        new ProcessScrapeDataRequestDto({
                            mimeTypes: [],
                            itemIds: [itemId],
                            checkDuplicateData: true,
                            lastScrapeTimestamp: new Date(),
                        }),
                    );
                }

                break;
            }

            default: {
                this.loggerService.error(`[ScheduleJobService] Invalid schedule type: ${scheduleType}`);
                throw new AppException(ScheduleError.InvalidScheduleType);
            }
        }

        const scheduleJobEventEntities: ScheduleJobEventEntity[] = [];
        const jobs: Job<IScrapingJobQueueInterface>[] = requests.map((request) => {
            const scheduleJobEventId = uuidv4();
            const scheduleJobEventEntity = this.scheduleJobEventService.repository.create({
                scheduleJobId,
                payload: request,
                id: scheduleJobEventId,
                eventMessage: 'Scraping worker created',
                eventType: ScheduleJobEventType.PENDING,
            });
            scheduleJobEventEntities.push(scheduleJobEventEntity);

            return {
                data: {
                    request,
                    scheduleJobId,
                    scheduleJobEventId,
                },
                opts: {
                    removeOnFail: false,
                    removeOnComplete: true,
                    jobId: scheduleJobEventId,
                },
            } as Job<IScrapingJobQueueInterface>;
        });

        const result = await this.scheduleJobEventService.createMany(scheduleJobEventEntities);
        if (!result.length) {
            this.loggerService.error(`[ScheduleJobService] Error creating schedule job events: ${scheduleJobId}`);
            throw new AppException(ScheduleError.JobEventsCreateFailed);
        }

        return jobs;
    }
}
