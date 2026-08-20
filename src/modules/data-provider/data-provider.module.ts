import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from './constants/data-provider-scraper-service-map';
import { DATA_PROVIDER_SEARCH_SERVICE_MAP, DATA_PROVIDER_SEARCH_SERVICE_MAP_KEY } from './constants/data-provider-search-service-map';
import { DataProviderController } from './controllers/data-provider.controller';
import { DataProviderFeatureController } from './controllers/data-provider-feature.controller';
import { DataProviderItemController } from './controllers/data-provider-item.controller';
import { DataProviderSearchController } from './controllers/data-provider-search.controller';
import { ItemController } from './controllers/item.controller';
import { ScrapingDataController } from './controllers/scraping-data.controller';
import { DataProviderProfile } from './data-provider.profile';
import { ConfigVersionEntity } from './entities/config-version.entity';
import { DataProviderEntity } from './entities/data-provider.entity';
import { DataProviderFeatureEntity } from './entities/data-provider-feature.entity';
import { DataProviderItemEntity } from './entities/data-provider-item.entity';
import { ItemEntity } from './entities/item.entity';
import { ScrapingDataEntity } from './entities/scraping-data.entity';
import { ScraperServiceEnum } from './enums';
import { ExtractDataHelper } from './helpers/extract-data.helper';
import { UrlResolverHelper } from './helpers/url-resolver.helper';
import { IDataProviderScraperService, IDataProviderSearchService } from './interfaces';
import { ScrapingDataListener } from './listeners/scraping-data.listener';
import { FeatureRunnerRegistry } from './runners/feature-runner.registry';
import { ScrapingFeatureRunner } from './runners/scraping-feature.runner';
import { SearchFeatureRunner } from './runners/search-feature.runner';
import { ConfigVersionService } from './services/config-version.service';
import { DataProviderService } from './services/data-provider.service';
import { DataProviderFeatureService } from './services/data-provider-feature.service';
import { DataProviderItemService } from './services/data-provider-item.service';
import { DataProviderScraperService } from './services/data-provider-scraper.service';
import { ApiDataProviderScraperService } from './services/data-provider-scraper/api-data-provider-scraper.service';
import { GenericDataProviderScraperService } from './services/data-provider-scraper/generic-data-provider-scraper.service';
import { LocalDataProviderScraperService } from './services/data-provider-scraper/local-data-provider-scraper.service';
import { DataProviderSearchService } from './services/data-provider-search.service';
import { GenericDataProviderSearchService } from './services/data-provider-search/generic-data-provider-search.service';
import { ItemService } from './services/item.service';
import { ScraperService } from './services/scraper.service';
import { ScrapingDataService } from './services/scraping-data.service';

const helpers = [ExtractDataHelper, UrlResolverHelper];
const listeners = [ScrapingDataListener];
const entities = [
    DataProviderEntity,
    DataProviderFeatureEntity,
    DataProviderItemEntity,
    ScrapingDataEntity,
    ItemEntity,
    ConfigVersionEntity,
];
const controllers = [
    ItemController,
    ScrapingDataController,
    DataProviderController,
    DataProviderFeatureController,
    DataProviderItemController,
    DataProviderSearchController,
];
const runners = [ScrapingFeatureRunner, SearchFeatureRunner, FeatureRunnerRegistry];
const services = [
    ItemService,
    ScraperService,
    ScrapingDataService,
    ConfigVersionService,
    DataProviderService,
    DataProviderFeatureService,
    DataProviderItemService,
    DataProviderScraperService,
    ApiDataProviderScraperService,
    LocalDataProviderScraperService,
    GenericDataProviderScraperService,
    DataProviderSearchService,
    GenericDataProviderSearchService,
    ...runners,
];

@Module({
    imports: [TypeOrmModule.forFeature(entities), UserModule],
    controllers: [...controllers],
    providers: [
        ...helpers,
        ...services,
        ...listeners,
        DataProviderProfile,
        {
            provide: DATA_PROVIDER_SCRAPER_SERVICE_MAP,
            useFactory: (
                apiDataProviderScraperService: ApiDataProviderScraperService,
                localDataProviderScraperService: LocalDataProviderScraperService,
                genericDataProviderScraperService: GenericDataProviderScraperService,
            ): Record<string, IDataProviderScraperService> => ({
                [ScraperServiceEnum.API]: apiDataProviderScraperService,
                [ScraperServiceEnum.LOCAL]: localDataProviderScraperService,
                [ScraperServiceEnum.GENERIC]: genericDataProviderScraperService,
            }),
            inject: [ApiDataProviderScraperService, LocalDataProviderScraperService, GenericDataProviderScraperService],
        },
        {
            provide: DATA_PROVIDER_SEARCH_SERVICE_MAP,
            useFactory: (
                genericDataProviderSearchService: GenericDataProviderSearchService,
            ): Record<string, IDataProviderSearchService> => ({
                [DATA_PROVIDER_SEARCH_SERVICE_MAP_KEY.GENERIC]: genericDataProviderSearchService,
            }),
            inject: [GenericDataProviderSearchService],
        },
    ],
    exports: [...helpers, ...services, ...listeners, DataProviderProfile],
})
export class DataProviderModule {}
