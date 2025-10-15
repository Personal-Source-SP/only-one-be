import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf, ValidateNested } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../common/dto/pagination-request.dto';
import { GoogleDriveType } from '../../enums';
import { GoogleDrivePreviewItem } from '../responses/google-drive-preview-response.dto';

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

export class GoogleDrivePreviewRequest {
    @ApiProperty()
    @IsEnum(GoogleDriveType)
    type: GoogleDriveType;

    @ApiProperty()
    @IsString()
    googleAuthId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    pageSize?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxResults?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    folderId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    query?: string;
}

export class GoogleDriveSyncRequest {
    @ApiProperty()
    @IsEnum(GoogleDriveType)
    type: GoogleDriveType;

    @ApiProperty()
    @IsString()
    googleAuthId: string;

    @ApiProperty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GoogleDrivePreviewItem)
    data: GoogleDrivePreviewItem[];

    @ApiPropertyOptional()
    @ValidateIf((object) => object.type === GoogleDriveType.FILE)
    @IsUUID()
    folderId?: string;
}
