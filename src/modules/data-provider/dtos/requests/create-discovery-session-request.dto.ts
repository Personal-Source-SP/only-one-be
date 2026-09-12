import { AutoMap } from '@automapper/classes';

import { BooleanFieldOptional, NumberFieldOptional, StringFieldOptional, UUIDField } from '../../../../decorators';

export class CreateDiscoverySessionRequestDto {
    @UUIDField({ description: 'Data Provider ID' })
    @AutoMap()
    dataProviderId: string;

    @StringFieldOptional({ each: true, description: 'Target keywords for search feature and fuzzy matching' })
    @AutoMap()
    targetKeywords?: string[];

    @NumberFieldOptional({ int: true, min: 1, max: 5, description: 'Crawl depth (1-5)', default: 1 })
    @AutoMap()
    depth?: number;

    @NumberFieldOptional({
        int: true,
        min: 1,
        max: 10000,
        default: null,
        description: 'Maximum URLs to discover (override search config maxResults)',
    })
    @AutoMap()
    maxUrls?: number;

    @BooleanFieldOptional({ description: 'Automatically run validation batch upon completion', default: true })
    @AutoMap()
    autoValidate?: boolean;
}
