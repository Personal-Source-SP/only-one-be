import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { LoggerService } from '../../../../shared/services/logger.service';
import { ProcessSearchDataRequestDto } from '../../../data-provider/dtos/requests';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../../../data-provider/enums';
import { DataProviderService } from '../../../data-provider/services/data-provider.service';
import { QUEUE_NAME } from '../../../queue/enums/queue-name.enum';
import { ISearchJobQueueInterface } from '../../../queue/interfaces';
import { QueueService } from '../../../queue/services/queue.service';
import { PayloadScheduleDto } from '../../dtos/requests';
import { ScheduleJobEventEntity } from '../../entities/schedule-job-event.entity';
import { ScheduleJobEventType, ScheduleType } from '../../enums';
import { IAddJobRequest, IScheduleExecutionInterface } from '../../interfaces';
import { ScheduleJobEventService } from '../schedule-job-event.service';

@Injectable()
export class SearchScheduleService implements IScheduleExecutionInterface {
    private readonly loggerService: LoggerService = new LoggerService(SearchScheduleService.name);

    constructor(
        private readonly queueService: QueueService,
        private readonly dataProviderService: DataProviderService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
    ) {}

    async addJob(request: IAddJobRequest): Promise<boolean> {
        const { scheduleJobId, scheduleType, jobPayload } = request;

        const jobs = await this.getJobData(scheduleJobId, scheduleType, jobPayload);

        const queues = await this.queueService.addBulkJob(QUEUE_NAME.SEARCH_JOB, jobs);
        if (!queues.length) {
            this.loggerService.error(`[SearchScheduleService] Error adding search job to queue: ${scheduleJobId}`);
            throw new BadRequestException('Error adding search job to queue');
        }

        return true;
    }

    private async getJobData(
        scheduleJobId: string,
        scheduleType: ScheduleType,
        jobPayload?: PayloadScheduleDto,
    ): Promise<{ data: ISearchJobQueueInterface; opts?: any }[]> {
        const requests: ProcessSearchDataRequestDto[] = [];

        switch (scheduleType) {
            case ScheduleType.GLOBAL: {
                const dataProviders = await this.dataProviderService.repository
                    .createQueryBuilder('dataProvider')
                    .innerJoin('dataProvider.features', 'feature', 'feature.type = :type AND feature.status = :status', {
                        type: DataProviderFeatureType.SEARCH,
                        status: DataProviderFeatureStatus.READY,
                    })
                    .getMany();

                if (!dataProviders.length) {
                    this.loggerService.error(`[SearchScheduleService] No data providers available with active SEARCH feature`);
                    throw new NotFoundException('No data providers available with active SEARCH feature');
                }

                for (const dataProvider of dataProviders) {
                    requests.push(
                        new ProcessSearchDataRequestDto({
                            dataProviderIds: [dataProvider.id],
                            searchQueries: jobPayload?.searchQueries || [],
                            barcodes: jobPayload?.barcodes || [],
                        }),
                    );
                }
                break;
            }

            case ScheduleType.DATA_PROVIDER: {
                if (!jobPayload?.dataProviderIds?.length) {
                    this.loggerService.error(`[SearchScheduleService] No data provider IDs specified in jobPayload`);
                    throw new NotFoundException('No data providers specified for search schedule');
                }

                requests.push(
                    new ProcessSearchDataRequestDto({
                        dataProviderIds: jobPayload.dataProviderIds,
                        searchQueries: jobPayload.searchQueries || [],
                        barcodes: jobPayload.barcodes || [],
                    }),
                );
                break;
            }

            default: {
                this.loggerService.error(`[SearchScheduleService] Invalid schedule type for search: ${scheduleType}`);
                throw new BadRequestException('Invalid schedule type for search');
            }
        }

        const scheduleJobEventEntities: ScheduleJobEventEntity[] = [];
        const jobs = requests.map((request) => {
            const scheduleJobEventId = uuidv4();
            const scheduleJobEventEntity = this.scheduleJobEventService.repository.create({
                scheduleJobId,
                payload: request,
                id: scheduleJobEventId,
                eventMessage: 'Search discovery worker created',
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
                },
            };
        });

        await this.scheduleJobEventService.repository.save(scheduleJobEventEntities);
        return jobs;
    }
}
