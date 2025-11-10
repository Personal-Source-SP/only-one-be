import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ScheduleJobTriggerType, ScheduleJobType, ScheduleType } from '../enums';
import { ScheduleJobEventDto } from './schedule-job-event.dto';
import { ScheduleDto } from './schedule.dto';

export class ScheduleJobDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    scheduleId: string;

    @ApiResponseProperty()
    @AutoMap()
    scheduleType: ScheduleType;

    @ApiResponseProperty()
    @AutoMap()
    triggerType: ScheduleJobTriggerType;

    @ApiResponseProperty()
    @AutoMap()
    status: ScheduleJobType;

    @ApiResponseProperty()
    @AutoMap()
    retryCount: number;

    @ApiResponseProperty()
    @AutoMap()
    jobPayload: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    startedAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    finishedAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    errorMessage?: string;

    @ApiResponseProperty()
    @AutoMap(() => ScheduleDto)
    schedule: ScheduleDto;

    @ApiResponseProperty()
    @AutoMap(() => [ScheduleJobEventDto])
    scheduleJobEvents?: ScheduleJobEventDto[];
}
