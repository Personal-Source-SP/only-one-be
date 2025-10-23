import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DataProviderSearchStatus, DataProviderStatus, ScraperServiceEnum } from '../enums';
import { ISearchConfig, ITargetConfig } from '../interfaces';
import { ConfigVersionDto } from './config-version.dto';
import { DataProviderItemDto } from './data-provider-item.dto';

export class DataProviderDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    identifier?: string;

    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    scraperService: ScraperServiceEnum;

    @ApiResponseProperty()
    @AutoMap()
    baseUrl: string;

    @ApiResponseProperty()
    @AutoMap()
    status: DataProviderStatus;

    @ApiResponseProperty()
    @AutoMap()
    targetConfig?: ITargetConfig;

    @ApiResponseProperty()
    @AutoMap()
    lastSuccessfulScrapeAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    lastFailedScrapeAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    searchConfig?: ISearchConfig;

    @ApiResponseProperty()
    @AutoMap()
    searchService: string;

    @ApiResponseProperty()
    @AutoMap()
    searchStatus: DataProviderSearchStatus;

    @ApiResponseProperty()
    @AutoMap(() => [DataProviderItemDto])
    dataProviderItems?: DataProviderItemDto[];

    @ApiResponseProperty()
    @AutoMap(() => [ConfigVersionDto])
    configVersions?: ConfigVersionDto[];
}
