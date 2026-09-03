import { ApiProperty } from '@nestjs/swagger';

export class IngestDiscoveredUrlResponseDto {
    @ApiProperty({ description: 'ID of the resolved or created Item' })
    itemId: string;

    @ApiProperty({ description: 'ID of the resolved or created DataProviderItem' })
    dataProviderItemId: string;

    @ApiProperty({ description: 'Indicates whether a new Item was created' })
    isNewItem: boolean;

    constructor(data?: Partial<IngestDiscoveredUrlResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
