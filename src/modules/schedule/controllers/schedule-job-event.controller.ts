import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { SCHEDULE_JOB_EVENT_PAGINATION_CONFIG } from '../constants/schedule-job-event.config';
import { ScheduleJobEventDto } from '../dtos/schedule-job-event.dto';
import { ScheduleJobEventEntity } from '../entities/schedule-job-event.entity';
import { ScheduleJobEventService } from '../services/schedule-job-event.service';

@ApiTags('Schedule Job Events')
@Controller('schedule-job-events')
export class ScheduleJobEventController extends BaseController<ScheduleJobEventEntity, ScheduleJobEventDto> {
    constructor(private readonly scheduleJobEventService: ScheduleJobEventService) {
        super(scheduleJobEventService, SCHEDULE_JOB_EVENT_PAGINATION_CONFIG);
    }
}
