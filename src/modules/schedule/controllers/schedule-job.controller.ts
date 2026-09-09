import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Get, UUIDParam } from '../../../decorators';
import { ScheduleJobDto } from '../dtos/schedule-job.dto';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';
import { ScheduleJobService } from '../services/schedule-job.service';

@ApiTags('Schedule Jobs')
@Controller('schedule-jobs')
export class ScheduleJobController extends BaseController<ScheduleJobEntity, ScheduleJobDto> {
    constructor(private readonly scheduleJobService: ScheduleJobService) {
        super(scheduleJobService);
    }

    @Get({
        path: 'schedule/:scheduleId',
        summary: 'Get schedule jobs by schedule id',
        responseDto: [ScheduleJobDto],
    })
    async getByScheduleId(@UUIDParam('scheduleId') scheduleId: string): Promise<ScheduleJobDto[]> {
        const result = await this.scheduleJobService.findListByFilter({ scheduleId });
        return result;
    }
}
