import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ProcessSearchDataRequestDto {
    @ApiPropertyOptional({ description: 'Optional list of DataProvider IDs to search' })
    @IsOptional()
    @IsArray()
    dataProviderIds?: string[];

    @ApiPropertyOptional({ description: 'Optional explicit search queries (overrides config defaults)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    searchQueries?: string[];

    @ApiPropertyOptional({ description: 'Optional barcodes to search' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    barcodes?: string[];

    constructor(data?: Partial<ProcessSearchDataRequestDto>) {
        if (data) Object.assign(this, data);
    }
}
