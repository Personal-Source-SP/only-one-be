import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from './constants/data-provider-scraper-service-map';
import { DataProviderController } from './controllers/data-provider.controller';
import { DataProviderFeatureController } from './controllers/data-provider-feature.controller';
import { DataProviderItemController } from './controllers/data-provider-item.controller';
import { DiscoverySessionController } from './controllers/discovery-session.controller';
import { DiscoveryUrlController } from './controllers/discovery-url.controller';
import { ItemController } from './controllers/item.controller';
import { ScrapingDataController } from './controllers/scraping-data.controller';
import { DataProviderProfile } from './data-provider.profile';
import { ConfigVersionEntity } from './entities/config-version.entity';
import { DataProviderEntity } from './entities/data-provider.entity';
import { DataProviderFeatureEntity } from './entities/data-provider-feature.entity';
import { DataProviderItemEntity } from './entities/data-provider-item.entity';
import { DiscoverySessionEntity } from './entities/discovery-session.entity';
import { DiscoveryUrlEntity } from './entities/discovery-url.entity';
import { DiscoveryValidationBatchEntity } from './entities/discovery-validation-batch.entity';
import { DiscoveryValidationLogEntity } from './entities/discovery-validation-log.entity';
import { ItemEntity } from './entities/item.entity';
import { ScrapingDataEntity } from './entities/scraping-data.entity';
import { ScraperServiceEnum } from './enums';
import { ExtractDataHelper } from './helpers/extract-data.helper';
import { UrlResolverHelper } from './helpers/url-resolver.helper';
import { IDataProviderScraperService } from './interfaces';
import { ScrapingDataListener } from './listeners/scraping-data.listener';
import { DiscoveryRunner } from './runners/discovery.runner';
import { FeatureRunnerRegistry } from './runners/feature-runner.registry';
import { ScrapingFeatureRunner } from './runners/scraping-feature.runner';
import { ConfigVersionService } from './services/config-version.service';
import { DataProviderService } from './services/data-provider.service';
import { DataProviderFeatureService } from './services/data-provider-feature.service';
import { DataProviderItemService } from './services/data-provider-item.service';
import { DataProviderScraperService } from './services/data-provider-scraper.service';
import { ApiDataProviderScraperService } from './services/data-provider-scraper/api-data-provider-scraper.service';
import { GenericDataProviderScraperService } from './services/data-provider-scraper/generic-data-provider-scraper.service';
import { LocalDataProviderScraperService } from './services/data-provider-scraper/local-data-provider-scraper.service';
import { DiscoverySessionService } from './services/discovery-session.service';
import { DiscoveryUrlService } from './services/discovery-url.service';
import { DiscoveryValidationService } from './services/discovery-validation.service';
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
    DiscoverySessionEntity,
    DiscoveryUrlEntity,
    DiscoveryValidationBatchEntity,
    DiscoveryValidationLogEntity,
];
const controllers = [
    ItemController,
    ScrapingDataController,
    DataProviderController,
    DataProviderFeatureController,
    DataProviderItemController,
    DiscoverySessionController,
    DiscoveryUrlController,
];
const runners = [ScrapingFeatureRunner, FeatureRunnerRegistry, DiscoveryRunner];
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
    DiscoverySessionService,
    DiscoveryValidationService,
    DiscoveryUrlService,
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
    ],
    exports: [...helpers, ...services, ...listeners, DataProviderProfile],
})
export class DataProviderModule {}
