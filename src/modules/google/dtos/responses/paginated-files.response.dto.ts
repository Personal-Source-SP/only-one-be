import { ApiProperty } from '@nestjs/swagger';
import { GoogleDriveFileResponseDto } from './google-drive-file.response.dto';

export class PaginatedFilesResponseDto {
    @ApiProperty({ description: 'Array of files', type: [GoogleDriveFileResponseDto] })
    files: GoogleDriveFileResponseDto[];

    @ApiProperty({ description: 'Total number of files' })
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Items per page' })
    limit: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;

    @ApiProperty({ description: 'Whether there is a next page' })
    hasNext: boolean;

    @ApiProperty({ description: 'Whether there is a previous page' })
    hasPrev: boolean;
}
