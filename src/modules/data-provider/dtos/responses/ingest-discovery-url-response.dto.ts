import { ApiProperty } from '@nestjs/swagger';

export class IngestDiscoveryUrlResponseDto {
    @ApiProperty({ description: 'Total URLs processed' })
    totalProcessed: number;

    @ApiProperty({ description: 'Number of new Items created' })
    itemsCreated: number;

    @ApiProperty({ description: 'Number of existing Items matched and reused' })
    itemsReused: number;

    @ApiProperty({ description: 'Number of DataProviderItems created' })
    dataProviderItemsCreated: number;

    constructor(data?: Partial<IngestDiscoveryUrlResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
