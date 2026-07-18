import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { CloudDataProviderDto } from '../../cloud-data/dtos/cloud-data-provider.dto';
import { DataProviderDto } from './data-provider.dto';
import { ItemDto } from './item.dto';
import { ScrapingDataDto } from './scraping-data.dto';

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
    isSavedToCloudData: boolean;

    @ApiResponseProperty()
    @AutoMap()
    lastScrapedTimestamp?: Date;

    @ApiResponseProperty()
    @AutoMap()
    cloudDataProviderId?: string;

    @ApiResponseProperty()
    @AutoMap(() => ItemDto)
    item: ItemDto;

    @ApiResponseProperty()
    @AutoMap(() => DataProviderDto)
    dataProvider: DataProviderDto;

    @ApiResponseProperty()
    @AutoMap(() => CloudDataProviderDto)
    cloudDataProvider?: CloudDataProviderDto;

    @ApiResponseProperty()
    @AutoMap(() => [ScrapingDataDto])
    scrapingData?: ScrapingDataDto[];
}
