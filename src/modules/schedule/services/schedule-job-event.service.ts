import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { ScheduleJobEventDto } from '../dtos/schedule-job-event.dto';
import { ScheduleJobEventEntity } from '../entities/schedule-job-event.entity';

@Injectable()
export class ScheduleJobEventService extends BaseService<ScheduleJobEventEntity, ScheduleJobEventDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleJobEventEntity) scheduleJobEventRepository: Repository<ScheduleJobEventEntity>,
    ) {
        super(scheduleJobEventRepository, mapper, ScheduleJobEventDto, ScheduleJobEventService.name);
    }
}
