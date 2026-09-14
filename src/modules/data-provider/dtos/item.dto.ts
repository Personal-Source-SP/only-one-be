import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ProductMappingStatus } from '../enums';
import { DataProviderItemDto } from './data-provider-item.dto';
import { DiscoveryUrlDto } from './discovery-url.dto';
import { ScrapingDataDto } from './scraping-data.dto';

export class ItemDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    mappingStatus: ProductMappingStatus;

    @ApiResponseProperty()
    @AutoMap()
    code: string;

    @ApiResponseProperty()
    @AutoMap()
    tags?: string[];

    @ApiResponseProperty()
    @AutoMap()
    metadata?: Record<string, unknown>;

    @ApiResponseProperty()
    @AutoMap(() => [DataProviderItemDto])
    dataProviderItems?: DataProviderItemDto[];

    @ApiResponseProperty()
    @AutoMap(() => [DiscoveryUrlDto])
    discoveryUrls?: DiscoveryUrlDto[];
}
