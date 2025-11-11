import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Job } from 'bull';
import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { ProcessScrapeDataRequestDto } from '../../data-provider/dtos/requests';
import { DataProviderStatus } from '../../data-provider/enums';
import { DataProviderService } from '../../data-provider/services/data-provider.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IScrapingJobQueueInterface } from '../../queue/interfaces';
import { QueueService } from '../../queue/services/queue.service';
import { CreateScheduleJobRequestDto, PayloadScheduleDto } from '../dtos/requests';
import { ScheduleJobDto } from '../dtos/schedule-job.dto';
import { ScheduleJobEventEntity } from '../entities/schedule-job-event.entity';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';
import { ScheduleJobEventType, ScheduleType } from '../enums';
import { ScheduleJobEventService } from './schedule-job-event.service';

@Injectable()
export class ScheduleJobService extends BaseService<ScheduleJobEntity, ScheduleJobDto> {
    constructor(
        private readonly queueService: QueueService,
        private readonly loggerService: LoggerService,
        private readonly dataProviderService: DataProviderService,

        @Inject(forwardRef(() => ScheduleJobEventService))
        private readonly scheduleJobEventService: ScheduleJobEventService,

        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleJobEntity) scheduleJobRepository: Repository<ScheduleJobEntity>,
    ) {
        super(scheduleJobRepository, mapper, ScheduleJobDto);
    }

    async create(request: CreateScheduleJobRequestDto, user?: PayloadDto): Promise<ScheduleJobDto> {
        const entity = this.mapper.map(request, CreateScheduleJobRequestDto, ScheduleJobEntity);
        const result = await super.create(entity, user);

        const jobPayload = request.jobPayload;
        const jobs = await this.getJobData(result.id, result.scheduleType, jobPayload);

        const queues = await this.queueService.addBulkJob(QUEUE_NAME.SCRAPING_JOB, jobs);
        if (!queues.length) {
            this.loggerService.error(`[ScheduleJobService] Error adding job to queue: ${result.id}`);
            throw new BadRequestException('Error adding job to queue');
        }

        return result;
    }

    private async getJobData(
        scheduleJobId: string,
        scheduleType: ScheduleType,
        jobPayload?: PayloadScheduleDto,
    ): Promise<Job<IScrapingJobQueueInterface>[]> {
        const requests: ProcessScrapeDataRequestDto[] = [];

        switch (scheduleType) {
            case ScheduleType.GLOBAL: {
                const dataProviders = await this.dataProviderService.findListByFilter({
                    status: DataProviderStatus.READY,
                });

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

                for (const dataProviderId of jobPayload?.dataProviderIds) {
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

                for (const itemId of jobPayload?.itemIds) {
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
