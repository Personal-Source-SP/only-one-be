import { ItemDto } from './item.dto';
import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DataProviderItemDto } from './data-provider-item.dto';
import { DataProviderDto } from './data-provider.dto';

export class ScrapingDataDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    dataProviderId: string;

    @ApiResponseProperty()
    @AutoMap()
    dataProviderItemId: string;

    @ApiResponseProperty()
    @AutoMap()
    scrapeTimestamp: Date;

    @ApiResponseProperty()
    @AutoMap()
    dataId?: string;

    @ApiResponseProperty()
    @AutoMap()
    type?: string;

    @ApiResponseProperty()
    @AutoMap()
    url?: string;

    @ApiResponseProperty()
    @AutoMap()
    lastModified?: Date;

    @ApiResponseProperty()
    @AutoMap()
    metadata?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => DataProviderDto)
    dataProvider?: DataProviderDto;

    @ApiResponseProperty()
    @AutoMap(() => DataProviderItemDto)
    dataProviderItem?: DataProviderItemDto;

    @ApiResponseProperty()
    @AutoMap(() => ItemDto)
    item?: ItemDto;
}
