import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
