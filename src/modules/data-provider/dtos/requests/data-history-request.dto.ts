import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ScrapeStatusEnum } from '../../enums/scrape-status.enum';

export class CreateDataHistoryRequestDto {
    @ApiProperty()
    @IsUUID()
    @AutoMap()
    dataProviderItemId: string;

    @ApiProperty()
    @IsEnum(ScrapeStatusEnum)
    @AutoMap()
    status: ScrapeStatusEnum;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    @AutoMap()
    price?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    @AutoMap()
    regularPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(10)
    @AutoMap()
    currency?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @AutoMap()
    metadata?: Record<string, any>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @AutoMap()
    errorMessage?: string;
}

export class FilterDataHistoryPaginationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    dataProviderItemId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(ScrapeStatusEnum)
    status?: ScrapeStatusEnum;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(10)
    currency?: string;
}

export class DataHistoryPaginationRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    filter?: FilterDataHistoryPaginationDto;
}

export class ProcessScrapeDataRequestDto {
    @ApiProperty()
    @IsArray()
    dataProviderIds: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsDate()
    lastScrapeTimestamp?: Date;
}
