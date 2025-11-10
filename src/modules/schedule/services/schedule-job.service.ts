import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Job } from 'bull';
import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { ProcessScrapeDataRequestDto } from '../../data-provider/dtos/requests';
import { DataProviderStatus } from '../../data-provider/enums';
import { DataProviderService } from '../../data-provider/services/data-provider.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { QueueService } from '../../queue/services/queue.service';
import { CreateScheduleJobEventRequestDto, CreateScheduleJobRequestDto, PayloadScheduleDto } from '../dtos/requests';
import { ScheduleJobDto } from '../dtos/schedule-job.dto';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';
import { ScheduleJobEventType, ScheduleType } from '../enums';
import { ScheduleJobEventService } from './schedule-job-event.service';

@Injectable()
export class ScheduleJobService extends BaseService<ScheduleJobEntity, ScheduleJobDto> {
    constructor(
        private readonly queueService: QueueService,
        private readonly loggerService: LoggerService,
        private readonly dataProviderService: DataProviderService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleJobEntity) scheduleJobRepository: Repository<ScheduleJobEntity>,
    ) {
        super(scheduleJobRepository, mapper, ScheduleJobDto);
    }

    async create(request: CreateScheduleJobRequestDto, user?: PayloadDto): Promise<ScheduleJobDto> {
        const schedule = await this.findOneByFilter({ id: request.scheduleId });
        if (!schedule) {
            this.loggerService.error(`[ScheduleJobService] Schedule not found: ${request.scheduleId}`);
            throw new NotFoundException('Schedule not found');
        }

        const entity = this.mapper.map(request, CreateScheduleJobRequestDto, ScheduleJobEntity);
        const result = await super.create(entity, user);

        const jobPayload = request.jobPayload;
        const jobs = await this.getJobData(result.id, result.scheduleType, jobPayload);

        const queues = await this.queueService.addBulkJob(QUEUE_NAME.SCRAPING_JOB_QUEUE, [{ data: jobs }]);
        if (!queues.length) {
            this.loggerService.error(`[ScheduleJobService] Error adding job to queue: ${request.scheduleId}`);
            throw new Error('Error adding job to queue');
        }

        return result;
    }

    private async getJobData(
        scheduleJobId: string,
        scheduleType: ScheduleType,
        jobPayload: PayloadScheduleDto,
    ): Promise<Job<ProcessScrapeDataRequestDto>[]> {
        const jobs: Job<ProcessScrapeDataRequestDto>[] = [];

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
                    jobs.push({
                        data: new ProcessScrapeDataRequestDto({
                            mimeTypes: [],
                            checkDuplicateData: true,
                            lastScrapeTimestamp: new Date(),
                            dataProviderIds: [dataProvider.id],
                        }),
                        opts: {
                            removeOnFail: false,
                            removeOnComplete: true,
                            jobId: dataProvider.id,
                        },
                    } as Job<ProcessScrapeDataRequestDto>);
                }

                break;
            }

            case ScheduleType.DATA_PROVIDER: {
                if (!jobPayload?.dataProviderIds?.length) {
                    this.loggerService.error(`[ScheduleJobService] No data providers available to scrape: ${scheduleType}`);
                    throw new NotFoundException('No data providers available to scrape');
                }

                for (const dataProviderId of jobPayload?.dataProviderIds) {
                    jobs.push({
                        data: new ProcessScrapeDataRequestDto({
                            mimeTypes: [],
                            checkDuplicateData: true,
                            lastScrapeTimestamp: new Date(),
                            dataProviderIds: [dataProviderId],
                        }),
                        opts: {
                            removeOnFail: false,
                            removeOnComplete: true,
                            jobId: dataProviderId,
                        },
                    } as Job<ProcessScrapeDataRequestDto>);
                }

                break;
            }

            case ScheduleType.ITEM: {
                if (!jobPayload?.itemIds?.length) {
                    this.loggerService.error(`[ScheduleJobService] No items available to scrape: ${scheduleType}`);
                    throw new NotFoundException('No items available to scrape');
                }

                for (const itemId of jobPayload?.itemIds) {
                    jobs.push({
                        data: new ProcessScrapeDataRequestDto({
                            mimeTypes: [],
                            itemIds: [itemId],
                            checkDuplicateData: true,
                            lastScrapeTimestamp: new Date(),
                        }),
                        opts: {
                            removeOnFail: false,
                            removeOnComplete: true,
                            jobId: itemId,
                        },
                    } as Job<ProcessScrapeDataRequestDto>);
                }

                break;
            }

            default: {
                this.loggerService.error(`[ScheduleJobService] Invalid schedule type: ${scheduleType}`);
                throw new BadRequestException('Invalid schedule type');
            }
        }

        const scheduleJobEventEntities: CreateScheduleJobEventRequestDto[] = jobs.map((job) => {
            return new CreateScheduleJobEventRequestDto({
                scheduleJobId,
                eventMessage: 'Scraping worker created',
                eventType: ScheduleJobEventType.PENDING,
            });
        });

        const result = await this.scheduleJobEventService.createMany(scheduleJobEventEntities);
        if (!result.length) {
            this.loggerService.error(`[ScheduleJobService] Error creating schedule job events: ${scheduleJobId}`);
            throw new InternalServerErrorException('Error creating schedule job events');
        }

        return jobs;
    }
}
