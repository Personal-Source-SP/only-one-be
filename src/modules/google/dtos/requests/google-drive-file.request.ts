import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../common/dto/pagination-request.dto';

export class FilterGoogleDriveFilePaginationDto {
    @ApiPropertyOptional({ description: 'Filter by mime type' })
    @IsOptional()
    @IsString()
    mimeType?: string;

    @ApiPropertyOptional({ description: 'Filter by starred only' })
    @IsOptional()
    @IsString()
    starredOnly?: boolean;

    @ApiPropertyOptional({ description: 'Filter by trashed only' })
    @IsOptional()
    @IsString()
    trashedOnly?: boolean;
}

export class GoogleDriveFilePaginationRequestDto extends BasePaginationRequestDto<FilterGoogleDriveFilePaginationDto> {
    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested({ always: true })
    @Type(() => FilterGoogleDriveFilePaginationDto)
    filter?: FilterGoogleDriveFilePaginationDto;
}
