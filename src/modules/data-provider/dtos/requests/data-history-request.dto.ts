import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDate, IsOptional, IsUUID } from 'class-validator';

export class CreateDataHistoryRequestDto {
    @ApiProperty()
    @IsUUID()
    @AutoMap()
    dataProviderItemId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDate()
    @AutoMap()
    scrapeTimestamp?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @AutoMap()
    metadata?: Record<string, any>;
}

export class FilterDataHistoryPaginationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    dataProviderItemId?: string;
}

export class DataHistoryPaginationRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    filter?: FilterDataHistoryPaginationDto;
}

export class ProcessScrapeDataRequestDto {
    @ApiProperty()
    @IsOptional()
    @IsArray()
    dataProviderIds?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsDate()
    lastScrapeTimestamp?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    checkDuplicateData?: boolean;
}
