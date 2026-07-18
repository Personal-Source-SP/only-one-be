import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CloudDataProfile } from './cloud-data.profile';
import { CLOUD_DATA_SERVICE_MAP } from './constants';
import { CloudDataItemController } from './controllers/cloud-data-item.controller';
import { CloudDataProviderController } from './controllers/cloud-data-provider.controller';
import { CloudDataItemEntity } from './entities/cloud-data-item.entity';
import { CloudDataProviderEntity } from './entities/cloud-data-provider.entity';
import { CloudDataProviderType } from './enums';
import { ICloudDataService } from './interfaces';
import { TelegramCloudListener } from './listeners/telegram-cloud.listener';
import { CloudDataItemService } from './services/cloud-data-item.service';
import { CloudDataProviderService } from './services/cloud-data-provider.service';
import { TelegramCloudService } from './services/cloud-service/telegram-cloud-data.service';

const listeners = [TelegramCloudListener];
const entities = [CloudDataProviderEntity, CloudDataItemEntity];
const controllers = [CloudDataProviderController, CloudDataItemController];
const services = [CloudDataProviderService, CloudDataItemService, TelegramCloudService];

@Global()
@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    controllers: [...controllers],
    providers: [
        ...services,
        ...listeners,
        CloudDataProfile,
        {
            provide: CLOUD_DATA_SERVICE_MAP,
            useFactory: (telegramCloudService: TelegramCloudService): Record<CloudDataProviderType, ICloudDataService> => ({
                [CloudDataProviderType.TELEGRAM]: telegramCloudService,
            }),
            inject: [TelegramCloudService],
        },
    ],
    exports: [...services, ...listeners, CloudDataProfile],
})
export class CloudDataModule {}
