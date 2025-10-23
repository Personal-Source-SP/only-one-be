import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP, DATA_PROVIDER_SCRAPER_SERVICE_MAP_KEY } from './constants/data-provider-scraper-service-map';
import { DataHistoryController } from './controllers/data-history.controller';
import { DataProviderItemController } from './controllers/data-provider-item.controller';
import { DataProviderController } from './controllers/data-provider.controller';
import { ItemController } from './controllers/item.controller';
import { ParserController } from './controllers/parser.controller';
import { DataProviderProfile } from './data-provider.profile';
import { ConfigVersionEntity } from './entities/config-version.entity';
import { DataHistoryEntity } from './entities/data-history.entity';
import { DataProviderItemEntity } from './entities/data-provider-item.entity';
import { DataProviderEntity } from './entities/data-provider.entity';
import { ItemEntity } from './entities/item.entity';
import { ExtractDataHelper } from './helpers/extract-data.helper';
import { IDataProviderScraperService } from './interfaces';
import { ApiDataProviderScraperService } from './services/api-data-provider-scraper.service';
import { ConfigVersionService } from './services/config-version.service';
import { DataHistoryService } from './services/data-history.service';
import { DataProviderItemService } from './services/data-provider-item.service';
import { DataProviderScraperService } from './services/data-provider-scraper.service';
import { DataProviderService } from './services/data-provider.service';
import { GenericDataProviderScraperService } from './services/generic-data-provider-scraper.service';
import { ItemService } from './services/item.service';
import { ParserService } from './services/parser.service';
import { ScraperService } from './services/scraper.service';

const helpers = [ExtractDataHelper];
const entities = [DataProviderEntity, DataProviderItemEntity, DataHistoryEntity, ItemEntity, ConfigVersionEntity];
const controllers = [ItemController, DataHistoryController, DataProviderController, DataProviderItemController, ParserController];
const services = [
    ItemService,
    ParserService,
    ScraperService,
    DataHistoryService,
    ConfigVersionService,
    DataProviderService,
    DataProviderItemService,
    DataProviderScraperService,
    GenericDataProviderScraperService,
];

@Module({
    imports: [TypeOrmModule.forFeature(entities), UserModule],
    controllers: [...controllers],
    providers: [
        ...helpers,
        ...services,
        DataProviderProfile,
        {
            provide: DATA_PROVIDER_SCRAPER_SERVICE_MAP,
            useFactory: (
                apiDataProviderScraperService: ApiDataProviderScraperService,
                genericDataProviderScraperService: GenericDataProviderScraperService,
            ): Record<string, IDataProviderScraperService> => ({
                [DATA_PROVIDER_SCRAPER_SERVICE_MAP_KEY.API]: apiDataProviderScraperService,
                [DATA_PROVIDER_SCRAPER_SERVICE_MAP_KEY.GENERIC]: genericDataProviderScraperService,
            }),
            inject: [ApiDataProviderScraperService, GenericDataProviderScraperService],
        },
    ],
    exports: [...helpers, ...services, DataProviderProfile],
})
export class DataProviderModule {}
