import { AutoMap } from '@automapper/classes';
import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ScheduleType } from '../../enums';

export class PayloadScheduleDto {
    @ApiPropertyOptional({ description: 'Data provider IDs to pass to the schedule' })
    @IsOptional()
    @IsArray()
    @AutoMap()
    dataProviderIds?: string[];

    @ApiPropertyOptional({ description: 'Data provider item IDs to pass to the schedule' })
    @IsOptional()
    @IsArray()
    @AutoMap()
    dataProviderItemIds?: string[];

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

    @ApiProperty()
    @IsBoolean()
    @AutoMap()
    enabled: boolean;

    @ApiProperty({ description: 'Worker service for the schedule', example: 'scraping-service' })
    @IsString()
    @MaxLength(255)
    @AutoMap()
    workerService: string;

    @ApiProperty({ description: 'Cron expression for the scraping schedule', example: '0 0 * * *' })
    @IsString()
    @MaxLength(255)
    @AutoMap()
    cronExpression: string;

    @ApiPropertyOptional()
    @Optional()
    @IsNumber()
    @AutoMap()
    minScrapeIntervalMinutes?: number = 60;

    @ApiPropertyOptional({ description: 'Payload to pass to the schedule' })
    @Optional()
    @IsObject()
    @AutoMap(() => PayloadScheduleDto)
    payload?: PayloadScheduleDto;
}
