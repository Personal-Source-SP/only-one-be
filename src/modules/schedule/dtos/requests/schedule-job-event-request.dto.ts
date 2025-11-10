import { AutoMap } from '@automapper/classes';
import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsString } from 'class-validator';
import { ScheduleJobEventType } from '../../enums';

export class CreateScheduleJobEventRequestDto {
    @ApiProperty({ description: 'Schedule job ID' })
    @IsString()
    @AutoMap()
    scheduleJobId: string;

    @ApiProperty({
        enum: ScheduleJobEventType,
        example: ScheduleJobEventType.PROCESSING,
        description: 'Event type of the schedule job',
    })
    @IsEnum(ScheduleJobEventType)
    @AutoMap()
    eventType: ScheduleJobEventType;

    @ApiProperty({ description: 'Event message of the schedule job' })
    @IsString()
    @AutoMap()
    eventMessage: string;

    @ApiPropertyOptional({ description: 'Metadata of the schedule job event' })
    @Optional()
    @IsObject()
    @AutoMap()
    metaData?: Record<string, any>;

    constructor(data?: Partial<CreateScheduleJobEventRequestDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
