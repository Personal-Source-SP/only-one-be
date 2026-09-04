import { AutoMap } from '@automapper/classes';

import { MimeType } from '../../../../common/enums/mime-type';
import {
    BooleanFieldOptional,
    DateFieldOptional,
    EnumFieldOptional,
    ObjectFieldOptional,
    UUIDField,
    UUIDFieldOptional,
} from '../../../../decorators';

export class CreateScrapingDataRequestDto {
    @UUIDField()
    @AutoMap()
    dataProviderItemId: string;

    @DateFieldOptional()
    @AutoMap()
    scrapeTimestamp?: Date;

    @ObjectFieldOptional()
    @AutoMap()
    metadata?: Record<string, any>;
}

export class FilterScrapingDataPaginationDto {
    @UUIDFieldOptional()
    dataProviderId?: string;
}

export class ScrapingDataPaginationRequestDto {
    @ObjectFieldOptional()
    filter?: FilterScrapingDataPaginationDto;
}

export class ProcessScrapeDataRequestDto {
    @UUIDFieldOptional({ each: true })
    dataProviderIds?: string[];

    @UUIDFieldOptional({ each: true })
    dataProviderItemIds?: string[];

    @UUIDFieldOptional({ each: true })
    itemIds?: string[];

    @DateFieldOptional()
    lastScrapeTimestamp?: Date;

    @BooleanFieldOptional({ description: 'Check duplicate data', default: true })
    checkDuplicateData?: boolean;

    @EnumFieldOptional(() => MimeType, { each: true })
    mimeTypes?: MimeType[];

    constructor(data?: Partial<ProcessScrapeDataRequestDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
