import { ApiProperty } from '@nestjs/swagger';

export class BatchEnqueueDiscoveryUrlsResponseDto {
    @ApiProperty({ description: 'Number of URLs enqueued for scraping' })
    enqueuedCount: number;

    constructor(data?: Partial<BatchEnqueueDiscoveryUrlsResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
