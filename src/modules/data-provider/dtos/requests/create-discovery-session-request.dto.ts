import { AutoMap } from '@automapper/classes';

import { BooleanFieldOptional, NumberFieldOptional, StringFieldOptional, URLField, UUIDField } from '../../../../decorators';

export class CreateDiscoverySessionRequestDto {
    @UUIDField({ description: 'Data Provider ID' })
    @AutoMap()
    dataProviderId: string;

    @URLField({ description: 'Target URL to begin link discovery' })
    @AutoMap()
    targetUrl: string;

    @NumberFieldOptional({ int: true, min: 1, max: 5, description: 'Crawl depth (1-5)', default: 1 })
    @AutoMap()
    depth?: number;

    @NumberFieldOptional({
        int: true,
        min: 1,
        max: 10000,
        description: 'Maximum URLs to discover (omit for unbounded discovery)',
        default: null,
    })
    @AutoMap()
    maxUrls?: number;

    @BooleanFieldOptional({ description: 'Automatically run validation batch upon completion', default: true })
    @AutoMap()
    autoValidate?: boolean;

    @StringFieldOptional({ description: 'Target keyword for fuzzy matching' })
    @AutoMap()
    targetKeyword?: string;

    @StringFieldOptional({ description: 'Notes for the session' })
    @AutoMap()
    notes?: string;
}
