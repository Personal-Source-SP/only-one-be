import { Module } from '@nestjs/common';

import { StoresController } from './controllers/stores.controller';
import { TelegramListener } from './listeners/telegram.listener';
import { TelegramStoreService } from './services/telegram-store.service';

const listeners = [TelegramListener];
const services = [TelegramStoreService];
const controllers = [StoresController];

@Module({
    imports: [],
    controllers: [...controllers],
    providers: [...services, ...listeners],
    exports: [...services, ...listeners],
})
export class StoresModule {}
