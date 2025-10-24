import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DataProviderItemDto } from './data-provider-item.dto';

export class DataHistoryDto extends AbstractDto {
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
    @AutoMap(() => DataProviderItemDto)
    dataProviderItem?: DataProviderItemDto;
}
