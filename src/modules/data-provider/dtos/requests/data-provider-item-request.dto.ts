import { AutoMap } from '@automapper/classes';

import {
    BooleanFieldOptional,
    NumberFieldOptional,
    URLField,
    URLFieldOptional,
    UUIDField,
    UUIDFieldOptional,
} from '../../../../decorators';

export class CreateDataProviderItemRequestDto {
    @UUIDField({ description: 'Item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @AutoMap()
    itemId: string;

    @UUIDField({ description: 'Data Provider ID', example: '123e4567-e89b-12d3-a456-426614174001' })
    @AutoMap()
    dataProviderId: string;

    @URLField({ description: 'URL to the item on the data provider website', example: 'https://example.com/item/123' })
    @AutoMap()
    itemUrl: string;

    @BooleanFieldOptional({ description: 'Active status of the data provider item' })
    @AutoMap()
    isActive?: boolean;

    @BooleanFieldOptional({ description: 'Auto process scraping of the data provider item' })
    autoProcessScraping?: boolean;

    @BooleanFieldOptional({ description: 'Check duplicate data', default: true })
    checkDuplicateData?: boolean;

    @BooleanFieldOptional({ description: 'Is saved to cloud data', default: false })
    @AutoMap()
    isSavedToCloudData?: boolean;

    @UUIDFieldOptional({ description: 'Cloud data provider ID', example: '123e4567-e89b-12d3-a456-426614174002' })
    @AutoMap()
    cloudDataProviderId?: string;
}

export class UpdateDataProviderItemRequestDto {
    @UUIDFieldOptional({ description: 'Item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    itemId?: string;

    @UUIDFieldOptional({ description: 'Data Provider ID', example: '123e4567-e89b-12d3-a456-426614174001' })
    dataProviderId?: string;

    @URLFieldOptional({ description: 'URL to the item on the data provider website', example: 'https://example.com/item/123' })
    itemUrl?: string;

    @BooleanFieldOptional({ description: 'Active status of the data provider item' })
    @AutoMap()
    isActive?: boolean;

    @BooleanFieldOptional({ description: 'Is saved to cloud data', default: false })
    @AutoMap()
    isSavedToCloudData?: boolean;

    @UUIDFieldOptional({ description: 'Cloud data provider ID', example: '123e4567-e89b-12d3-a456-426614174002' })
    @AutoMap()
    cloudDataProviderId?: string;
}

export class CreateManuallyTriggerScrapingRequestDto {
    @UUIDField({ each: true })
    ids: string[];

    @NumberFieldOptional({
        int: true,
        min: 0,
        description: 'Priority level (must be a positive integer greater than 0)',
        default: 10,
    })
    priority?: number;
}

export class TriggerManuallyScrapingBulkRequestDto {
    @UUIDField()
    productId: string;

    @NumberFieldOptional({
        int: true,
        min: 0,
        description: 'Priority level (must be a positive integer greater than 0)',
        default: 10,
    })
    priority?: number;
}
