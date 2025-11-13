import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ScrapingDataDto } from './scraping-data.dto';
import { DataProviderDto } from './data-provider.dto';
import { ItemDto } from './item.dto';

export class DataProviderItemDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    itemId: string;

    @ApiResponseProperty()
    @AutoMap()
    dataProviderId: string;

    @ApiResponseProperty()
    @AutoMap()
    itemUrl: string;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    lastScrapedTimestamp?: Date;

    @ApiResponseProperty()
    @AutoMap(() => ItemDto)
    item: ItemDto;

    @ApiResponseProperty()
    @AutoMap(() => DataProviderDto)
    dataProvider: DataProviderDto;

    @ApiResponseProperty()
    @AutoMap(() => [ScrapingDataDto])
    scrapingData?: ScrapingDataDto[];
}
