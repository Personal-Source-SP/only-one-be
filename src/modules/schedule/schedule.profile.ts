import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import {
    CreateScheduleJobEventRequestDto,
    CreateScheduleJobRequestDto,
    CreateScheduleRequestDto,
    UpdateScheduleRequestDto,
} from './dtos/requests';
import { ScheduleJobEventDto } from './dtos/schedule-job-event.dto';
import { ScheduleJobDto } from './dtos/schedule-job.dto';
import { ScheduleDto } from './dtos/schedule.dto';
import { ScheduleJobEventEntity } from './entities/schedule-job-event.entity';
import { ScheduleJobEntity } from './entities/schedule-job.entity';
import { ScheduleEntity } from './entities/schedule.entity';

@Injectable()
export class ScheduleProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, ScheduleEntity, ScheduleDto);
            createMap(mapper, ScheduleJobEntity, ScheduleJobDto);
            createMap(mapper, ScheduleJobEventEntity, ScheduleJobEventDto);

            createMap(mapper, CreateScheduleRequestDto, ScheduleEntity);
            createMap(mapper, UpdateScheduleRequestDto, ScheduleEntity);

            createMap(mapper, CreateScheduleJobRequestDto, ScheduleJobEntity);
            createMap(mapper, CreateScheduleJobEventRequestDto, ScheduleJobEventEntity);
        };
    }
}
