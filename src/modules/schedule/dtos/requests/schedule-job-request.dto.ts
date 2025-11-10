import { AutoMap } from '@automapper/classes';
import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsString } from 'class-validator';
import { ProcessScrapeDataRequestDto } from '../../../data-provider/dtos/requests';
import { ScheduleJobTriggerType } from '../../enums';

export class CreateScheduleJobRequestDto {
    @ApiProperty({ description: 'Schedule ID' })
    @IsString()
    @AutoMap()
    scheduleId: string;

    @ApiProperty({ description: 'Trigger type of the schedule job', enum: ScheduleJobTriggerType, example: ScheduleJobTriggerType.CRON })
    @IsEnum(ScheduleJobTriggerType)
    @AutoMap()
    triggerType: ScheduleJobTriggerType;

    @ApiPropertyOptional({ description: 'Job payload to pass to the schedule job' })
    @Optional()
    @IsObject()
    @AutoMap(() => ProcessScrapeDataRequestDto)
    jobPayload?: ProcessScrapeDataRequestDto;
}
