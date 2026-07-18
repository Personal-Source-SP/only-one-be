import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDate, IsOptional, IsString, IsUUID } from 'class-validator';

import { MimeType } from '../../../../common/enums/mime-type';

export class CreateScrapingDataRequestDto {
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

export class FilterScrapingDataPaginationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    dataProviderId?: string;
}

export class ScrapingDataPaginationRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    filter?: FilterScrapingDataPaginationDto;
}

export class ProcessScrapeDataRequestDto {
    @ApiProperty()
    @IsOptional()
    @IsArray()
    dataProviderIds?: string[];

    @ApiProperty()
    @IsOptional()
    @IsArray()
    dataProviderItemIds?: string[];

    @ApiProperty()
    @IsOptional()
    @IsArray()
    itemIds?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsDate()
    lastScrapeTimestamp?: Date;

    @ApiPropertyOptional({ description: 'Check duplicate data', default: true })
    @IsOptional()
    @IsBoolean()
    checkDuplicateData?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    mimeTypes?: MimeType[];

    constructor(data?: Partial<ProcessScrapeDataRequestDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
