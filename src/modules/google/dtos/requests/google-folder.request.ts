import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../common/dto/pagination-request.dto';

export class FilterGoogleDriveFolderPaginationDto {
    @ApiPropertyOptional({ description: 'Filter by name' })
    @IsOptional()
    @IsString()
    name?: string;
}

export class GoogleDriveFolderPaginationRequestDto extends BasePaginationRequestDto<FilterGoogleDriveFolderPaginationDto> {
    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested({ always: true })
    @Type(() => FilterGoogleDriveFolderPaginationDto)
    filter?: FilterGoogleDriveFolderPaginationDto;
}

export class UpdateGoogleDriveFolderRequest {
    @ApiPropertyOptional({ description: 'Filter by name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Filter by parent folder id' })
    @IsOptional()
    @IsString()
    parentFolderId?: string;
}
