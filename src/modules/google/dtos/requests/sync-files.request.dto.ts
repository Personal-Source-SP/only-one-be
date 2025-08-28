import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncFilesRequestDto {
    @ApiPropertyOptional({ description: 'Folder ID to sync from' })
    @IsOptional()
    @IsString()
    folderId?: string;

    @ApiPropertyOptional({ description: 'Include trashed files', default: false })
    @IsOptional()
    @IsBoolean()
    includeTrashed?: boolean;

    @ApiPropertyOptional({ description: 'Sync starred files only', default: false })
    @IsOptional()
    @IsBoolean()
    starredOnly?: boolean;

    @ApiPropertyOptional({ description: 'File type filter (e.g., application/pdf)' })
    @IsOptional()
    @IsString()
    mimeType?: string;
}
