import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDate, IsOptional, IsUUID } from 'class-validator';
import { MimeType } from '../../../../common/enums/mime-type';

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
    dataProviderId?: string;
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

    @ApiProperty()
    @IsOptional()
    @IsArray()
    dataProviderItemIds?: string[];

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
}
