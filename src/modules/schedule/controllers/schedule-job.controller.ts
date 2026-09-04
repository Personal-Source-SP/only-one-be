import { Controller, Get, HttpCode, HttpStatus, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse, UUIDParam } from '../../../decorators';
import { ScheduleJobDto } from '../dtos/schedule-job.dto';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';
import { ScheduleJobService } from '../services/schedule-job.service';

@ApiTags('Schedule Jobs')
@Controller('schedule-jobs')
export class ScheduleJobController extends BaseController<ScheduleJobEntity, ScheduleJobDto> {
    constructor(private readonly scheduleJobService: ScheduleJobService) {
        super(scheduleJobService);
    }

    @ApiOperation({ summary: 'Get schedule jobs by schedule id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('schedule/:scheduleId')
    @BaseApiOkResponse(ScheduleJobDto, { isArray: true })
    public async getByScheduleId(@UUIDParam('scheduleId') scheduleId: string): Promise<ScheduleJobDto[]> {
        const result = await this.scheduleJobService.findListByFilter({ scheduleId });
        return result;
    }
}
