import { ApiProperty } from '@nestjs/swagger';

export class IngestDiscoveryUrlResponseDto {
    @ApiProperty({ description: 'Total URLs processed' })
    totalProcessed: number;

    @ApiProperty({ description: 'Total URLs queued for background ingestion', required: false })
    totalQueued?: number;

    @ApiProperty({ description: 'Discovery session ID', required: false })
    sessionId?: string;

    @ApiProperty({ description: 'Number of new Items created', required: false })
    itemsCreated?: number;

    @ApiProperty({ description: 'Number of existing Items matched and reused', required: false })
    itemsReused?: number;

    @ApiProperty({ description: 'Number of DataProviderItems created', required: false })
    dataProviderItemsCreated?: number;

    constructor(data?: Partial<IngestDiscoveryUrlResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
