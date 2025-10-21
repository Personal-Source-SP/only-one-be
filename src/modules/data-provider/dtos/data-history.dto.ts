import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ScrapeStatusEnum } from '../enums/scrape-status.enum';
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
    status: ScrapeStatusEnum;

    @ApiResponseProperty()
    @AutoMap()
    metadata?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    errorMessage?: string;

    @ApiResponseProperty()
    @AutoMap(() => DataProviderItemDto)
    dataProviderItem?: DataProviderItemDto;
}
