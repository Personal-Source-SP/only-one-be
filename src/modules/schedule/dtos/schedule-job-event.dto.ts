import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ScheduleJobDto } from './schedule-job.dto';
import { ScheduleJobEventType } from '../enums';

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
    metaData?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => ScheduleJobDto)
    scheduleJob: ScheduleJobDto;
}
