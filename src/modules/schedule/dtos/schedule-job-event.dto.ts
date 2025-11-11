import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ScheduleJobEventType } from '../enums';
import { ScheduleJobDto } from './schedule-job.dto';

export class ScheduleJobEventDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    scheduleJobId: string;

    @ApiResponseProperty()
    @AutoMap()
    eventType: ScheduleJobEventType;

    @ApiResponseProperty()
    @AutoMap()
    eventMessage: string;

    @ApiResponseProperty()
    @AutoMap()
    retryCount: number;

    @ApiResponseProperty()
    @AutoMap()
    metaData?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    startedAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    finishedAt?: Date;

    @ApiResponseProperty()
    @AutoMap(() => ScheduleJobDto)
    scheduleJob: ScheduleJobDto;
}
