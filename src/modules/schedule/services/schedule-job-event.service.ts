import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { CreateScheduleJobEventRequestDto } from '../dtos/requests';
import { ScheduleJobEventDto } from '../dtos/schedule-job-event.dto';
import { ScheduleJobEventEntity } from '../entities/schedule-job-event.entity';
import { ScheduleJobService } from './schedule-job.service';

@Injectable()
export class ScheduleJobEventService extends BaseService<ScheduleJobEventEntity, ScheduleJobEventDto> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly scheduleJobService: ScheduleJobService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleJobEventEntity) scheduleJobEventRepository: Repository<ScheduleJobEventEntity>,
    ) {
        super(scheduleJobEventRepository, mapper, ScheduleJobEventDto);
    }

    async create(request: CreateScheduleJobEventRequestDto, user?: PayloadDto): Promise<ScheduleJobEventDto> {
        const scheduleJob = await this.scheduleJobService.findById(request.scheduleJobId);
        if (!scheduleJob) {
            this.loggerService.error(`[ScheduleJobEventService] Schedule job not found: ${request.scheduleJobId}`);
            throw new NotFoundException('Schedule job not found');
        }

        const entity = this.mapper.map(request, CreateScheduleJobEventRequestDto, ScheduleJobEventEntity);
        return await super.create(entity, user);
    }

    async createMany(requests: CreateScheduleJobEventRequestDto[], user?: PayloadDto): Promise<ScheduleJobEventDto[]> {
        const scheduleJobIds = requests.map((request) => request.scheduleJobId);
        const scheduleJobs = await this.scheduleJobService.findListByFilter({ id: In(scheduleJobIds) });

        if (!scheduleJobs.length) {
            this.loggerService.error(`[ScheduleJobEventService] Schedule jobs not found: ${scheduleJobIds}`);
            throw new NotFoundException('Schedule jobs not found');
        }

        const entities = this.mapper.mapArray(requests, CreateScheduleJobEventRequestDto, ScheduleJobEventEntity);
        return await this.createMany(entities, user);
    }
}
