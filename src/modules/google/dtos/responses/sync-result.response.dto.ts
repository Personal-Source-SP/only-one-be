import { ApiProperty } from '@nestjs/swagger';

export class SyncResultResponseDto {
    @ApiProperty({ description: 'Total files processed' })
    totalProcessed: number;

    @ApiProperty({ description: 'Files created' })
    created: number;

    @ApiProperty({ description: 'Files updated' })
    updated: number;

    @ApiProperty({ description: 'Files deleted' })
    deleted: number;

    @ApiProperty({ description: 'Files skipped' })
    skipped: number;

    @ApiProperty({ description: 'Sync duration in milliseconds' })
    duration: number;

    @ApiProperty({ description: 'Sync timestamp' })
    timestamp: Date;
}
