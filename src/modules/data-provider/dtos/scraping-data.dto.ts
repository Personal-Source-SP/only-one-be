import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DataProviderItemDto } from './data-provider-item.dto';
import { DataProviderDto } from './data-provider.dto';
import { ItemDto } from './item.dto';
import { MimeType } from '../../../common/enums';

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
    type?: MimeType;

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
    @AutoMap()
    cloudDataItemId?: string;

    @ApiResponseProperty()
    @AutoMap()
    cloudDataUrl?: string;

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
