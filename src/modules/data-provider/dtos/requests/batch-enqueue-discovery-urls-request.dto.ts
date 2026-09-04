import { UUIDField } from '../../../../decorators';

export class BatchEnqueueDiscoveryUrlsRequestDto {
    @UUIDField({ each: true, description: 'List of discovery URL IDs to enqueue for scraping' })
    urlIds: string[];
}
