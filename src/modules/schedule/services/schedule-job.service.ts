import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { SCHEDULE_EXECUTION_SERVICE_MAP } from '../constants/schedule-execution-service-map';
import { CreateScheduleJobRequestDto } from '../dtos/requests';
import { ScheduleJobDto } from '../dtos/schedule-job.dto';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';
import { ScheduleJobType } from '../enums';
import { IScheduleExecutionInterface } from '../interfaces';

@Injectable()
export class ScheduleJobService extends BaseService<ScheduleJobEntity, ScheduleJobDto> {
    constructor(
        private readonly loggerService: LoggerService,

        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleJobEntity) scheduleJobRepository: Repository<ScheduleJobEntity>,

        @Inject(SCHEDULE_EXECUTION_SERVICE_MAP)
        private readonly scheduleExecutionServiceMap: Record<string, IScheduleExecutionInterface>,
    ) {
        super(scheduleJobRepository, mapper, ScheduleJobDto);
    }

    async create(request: CreateScheduleJobRequestDto, user?: PayloadDto): Promise<ScheduleJobDto> {
        const entity = this.mapper.map(request, CreateScheduleJobRequestDto, ScheduleJobEntity);
        const result = await super.create(entity, user);

        try {
            const executionService = this.scheduleExecutionServiceMap[result.executionService];
            if (!executionService) {
                this.loggerService.error(`[ScheduleJobService] Invalid execution service: ${result.executionService}`);
                throw new BadRequestException('Invalid execution service');
            }

            const addJobResult = await executionService.addJob({
                scheduleJobId: result.id,
                jobPayload: result.jobPayload,
                scheduleType: result.scheduleType,
            });

            if (!addJobResult) {
                this.loggerService.error(`[ScheduleJobService] Error adding job to execution service: ${result.id}`);
                throw new BadRequestException('Error adding job to execution service');
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
