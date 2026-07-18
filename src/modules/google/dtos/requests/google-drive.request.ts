import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator';

import { MimeType } from '../../../../common/enums/mime-type';
import { GoogleDriveType } from '../../enums';
import { GoogleDrivePreviewItem } from '../responses/google-drive-preview-response.dto';

export class GoogleDrivePreviewRequest {
    @ApiProperty()
    @IsEnum(GoogleDriveType)
    type: GoogleDriveType;

    @ApiProperty()
    @IsString()
    googleAuthId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    fileTypes?: MimeType[];

    @ApiPropertyOptional({ description: 'Filter by modified time from (ISO string)' })
    @IsOptional()
    @IsDateString()
    modifiedTimeFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by modified time to (ISO string)' })
    @IsOptional()
    @IsDateString()
    modifiedTimeTo?: string;

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
    customQuery?: string;
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
    data: GoogleDrivePreviewItem[];

    @ApiPropertyOptional()
    @ValidateIf((object) => object.type === GoogleDriveType.FILE)
    @IsUUID()
    folderId?: string;
}
