import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { AppException } from '../../../exceptions/app.exception';
import { ScheduleError } from '../constants/schedule-error';
import { SCHEDULE_EXECUTION_SERVICE_MAP } from '../constants/schedule-execution-service-map';
import { CreateScheduleJobRequestDto } from '../dtos/requests';
import { ScheduleJobDto } from '../dtos/schedule-job.dto';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';
import { ScheduleJobType } from '../enums';
import { IScheduleExecutionInterface } from '../interfaces';

@Injectable()
export class ScheduleJobService extends BaseService<ScheduleJobEntity, ScheduleJobDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleJobEntity) scheduleJobRepository: Repository<ScheduleJobEntity>,

        @Inject(SCHEDULE_EXECUTION_SERVICE_MAP)
        private readonly scheduleExecutionServiceMap: Record<string, IScheduleExecutionInterface>,
    ) {
        super(scheduleJobRepository, mapper, ScheduleJobDto, ScheduleJobService.name);
    }

    async create(request: CreateScheduleJobRequestDto, user?: PayloadDto): Promise<ScheduleJobDto> {
        const entity = this.mapper.map(request, CreateScheduleJobRequestDto, ScheduleJobEntity);
        const result = await super.create(entity, user);

        try {
            const executionService = this.scheduleExecutionServiceMap[result.executionService];
            if (!executionService) {
                this.loggerService.error(`[ScheduleJobService] Invalid execution service: ${result.executionService}`);
                throw new AppException(ScheduleError.InvalidExecutionService);
            }

            const addJobResult = await executionService.addJob({
                scheduleJobId: result.id,
                jobPayload: result.jobPayload,
                scheduleType: result.scheduleType,
            });

            if (!addJobResult) {
                this.loggerService.error(`[ScheduleJobService] Error adding job to execution service: ${result.id}`);
                throw new AppException(ScheduleError.JobQueueAddFailed);
            }

            return result;
        } catch (error) {
            await super.update(
                result.id,
                { status: ScheduleJobType.FAILED, errorMessage: error?.message || 'Unknown error', finishedAt: new Date() },
                user,
            );

            throw error;
        }
    }
}
