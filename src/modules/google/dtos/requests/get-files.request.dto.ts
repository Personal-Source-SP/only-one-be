import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetFilesRequestDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Filter by file type (MIME type)' })
    @IsOptional()
    mimeType?: string;

    @ApiPropertyOptional({ description: 'Filter by starred files only' })
    @IsOptional()
    starredOnly?: boolean;

    @ApiPropertyOptional({ description: 'Filter by trashed files only' })
    @IsOptional()
    trashedOnly?: boolean;
}
