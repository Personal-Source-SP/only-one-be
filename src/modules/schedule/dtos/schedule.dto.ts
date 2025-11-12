import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ScheduleType } from '../enums';
import { ScheduleJobDto } from './schedule-job.dto';

export class ScheduleDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    type: ScheduleType;

    @ApiResponseProperty()
    @AutoMap()
    cronExpression: string;

    @ApiResponseProperty()
    @AutoMap()
    enabled: boolean;

    @ApiResponseProperty()
    @AutoMap()
    minScrapeIntervalMinutes: number;

    @ApiResponseProperty()
    @AutoMap()
    nextRunAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    lastRunAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    payload?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    jobCount?: number;

    @ApiResponseProperty()
    @AutoMap(() => [ScheduleJobDto])
    scheduleJobs: ScheduleJobDto[];
}
