import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';

import { LoggerService } from '../../../../shared/services/logger.service';
import { ProcessScrapeDataRequestDto } from '../../../data-provider/dtos/requests';
import { DataProviderStatus } from '../../../data-provider/enums';
import { DataProviderService } from '../../../data-provider/services/data-provider.service';
import { QUEUE_NAME } from '../../../queue/enums/queue-name.enum';
import { IScrapingJobQueueInterface } from '../../../queue/interfaces';
import { QueueService } from '../../../queue/services/queue.service';
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
            throw new BadRequestException('Error adding job to queue');
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
                const dataProviders = await this.dataProviderService.findListByFilter(
                    {
                        status: DataProviderStatus.READY,
                    },
                    {
                        relations: { dataProviderItems: true },
                    },
                );

                if (!dataProviders.length) {
                    this.loggerService.error(`[ScheduleJobService] No data providers available to scrape: ${scheduleType}`);
                    throw new NotFoundException('No data providers available to scrape');
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
                    throw new NotFoundException('No data providers available to scrape');
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
                    throw new NotFoundException('No items available to scrape');
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
                throw new BadRequestException('Invalid schedule type');
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
            throw new InternalServerErrorException('Error creating schedule job events');
        }

        return jobs;
    }
}
