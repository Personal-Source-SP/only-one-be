import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TELEGRAM_EVENTS } from '../constants';
import { TelegramUploadDocumentRequest } from '../dtos/requests';
import { TelegramStoreService } from '../services/telegram-store.service';

@Injectable()
export class TelegramListener {
    constructor(private readonly telegramStoreService: TelegramStoreService) {}

    @OnEvent(TELEGRAM_EVENTS.UPLOAD_FILE, { async: true })
    async handleUploadFile(file: Express.Multer.File, request: TelegramUploadDocumentRequest, messageId?: number): Promise<void> {
        await this.telegramStoreService.uploadFile(file, request, messageId);
    }
}
