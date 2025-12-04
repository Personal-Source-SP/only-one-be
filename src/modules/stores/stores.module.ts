import { Global, Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { STORE_SERVICE_MAP } from './constants';
import { StoresController } from './controllers/stores.controller';
import { StoreItemEntity } from './entities/store-item.entity';
import { StoreEntity } from './entities/store.entity';
import { StoreType } from './enums';
import { IStoreService } from './interfaces';
import { TelegramListener } from './listeners/telegram.listener';
import { StoreItemService } from './services/store-item.service';
import { StoreService } from './services/store.service';
import { TelegramStoreService } from './services/telegram-store.service';
import { StoreProfile } from './store.profile';

const listeners = [TelegramListener];
const controllers = [StoresController];
const entities = [StoreEntity, StoreItemEntity];
const services = [StoreService, StoreItemService, TelegramStoreService];

@Global()
@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    controllers: [...controllers],
    providers: [
        ...services,
        ...listeners,
        StoreProfile,
        {
            provide: STORE_SERVICE_MAP,
            useFactory: (telegramStoreService: TelegramStoreService): Record<StoreType, IStoreService> => ({
                [StoreType.TELEGRAM]: telegramStoreService,
            }),
            inject: [TelegramStoreService],
        },
    ],
    exports: [...services, ...listeners, StoreProfile],
})
export class StoresModule {}
