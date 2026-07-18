import { createMap, forMember, mapFrom, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { CreateScheduleJobRequestDto, CreateScheduleRequestDto, UpdateScheduleRequestDto } from './dtos/requests';
import { ScheduleDto } from './dtos/schedule.dto';
import { ScheduleJobDto } from './dtos/schedule-job.dto';
import { ScheduleJobEventDto } from './dtos/schedule-job-event.dto';
import { ScheduleEntity } from './entities/schedule.entity';
import { ScheduleJobEntity } from './entities/schedule-job.entity';
import { ScheduleJobEventEntity } from './entities/schedule-job-event.entity';

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

            createMap(
                mapper,
                CreateScheduleJobRequestDto,
                ScheduleJobEntity,
                forMember(
                    (d) => d.startedAt,
                    mapFrom(() => new Date()),
                ),
            );
        };
    }
}
