import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExecutionServiceEnum, ScheduleType } from '../../enums';

export class PayloadScheduleDto {
    @ApiPropertyOptional({ description: 'Data provider IDs to pass to the schedule' })
    @IsOptional()
    @IsArray()
    @AutoMap()
    dataProviderIds?: string[];

    @ApiPropertyOptional({ description: 'Item IDs to pass to the schedule' })
    @IsOptional()
    @IsArray()
    @AutoMap()
    itemIds?: string[];
}

export class CreateScheduleRequestDto {
    @ApiProperty({ description: 'Type of the schedule', enum: ScheduleType, example: ScheduleType.GLOBAL })
    @IsEnum(ScheduleType)
    @AutoMap()
    type: ScheduleType;

    @ApiProperty({
        description: 'Execution service of the schedule',
        enum: ExecutionServiceEnum,
        example: ExecutionServiceEnum.DATA_PROVIDER,
    })
    @IsEnum(ExecutionServiceEnum)
    @AutoMap()
    executionService: ExecutionServiceEnum;

    @ApiProperty()
    @IsBoolean()
    @AutoMap()
    enabled: boolean;

    @ApiProperty({ description: 'Cron expression for the scraping schedule', example: '0 0 * * *' })
    @IsString()
    @MaxLength(255)
    @AutoMap()
    cronExpression: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @AutoMap()
    minScrapeIntervalMinutes?: number = 60;

    @ApiPropertyOptional({ description: 'Payload to pass to the schedule' })
    @IsOptional()
    @IsObject()
    @AutoMap(() => PayloadScheduleDto)
    payload?: PayloadScheduleDto;
}

export class UpdateScheduleRequestDto {
    @ApiPropertyOptional({ description: 'Type of the schedule', enum: ScheduleType, example: ScheduleType.GLOBAL })
    @IsOptional()
    @IsEnum(ScheduleType)
    @AutoMap()
    type?: ScheduleType;

    @ApiPropertyOptional({
        description: 'Execution service of the schedule',
        enum: ExecutionServiceEnum,
        example: ExecutionServiceEnum.DATA_PROVIDER,
    })
    @IsOptional()
    @IsEnum(ExecutionServiceEnum)
    @AutoMap()
    executionService?: ExecutionServiceEnum;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    enabled?: boolean;

    @ApiProperty({ description: 'Cron expression for the scraping schedule', example: '0 0 * * *' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    cronExpression?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @AutoMap()
    minScrapeIntervalMinutes?: number;

    @ApiPropertyOptional({ description: 'Payload to pass to the schedule' })
    @IsOptional()
    @IsObject()
    @AutoMap(() => PayloadScheduleDto)
    payload?: PayloadScheduleDto;
}
