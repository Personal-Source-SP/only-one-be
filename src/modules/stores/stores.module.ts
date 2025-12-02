import { Module } from '@nestjs/common';

import { StoresController } from './controllers/stores.controller';
import { TelegramStoreService } from './services/telegram-store.service';

@Module({
    imports: [],
    controllers: [StoresController],
    providers: [TelegramStoreService],
    exports: [TelegramStoreService],
})
export class StoresModule {}
