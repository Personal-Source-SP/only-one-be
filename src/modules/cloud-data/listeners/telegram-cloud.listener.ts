import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TELEGRAM_CLOUD_EVENTS } from '../constants';
import { TelegramUploadDocumentRequest } from '../dtos/requests';
import { TelegramCloudService } from '../services/cloud-service/telegram-cloud-data.service';

@Injectable()
export class TelegramCloudListener {
    constructor(private readonly telegramCloudService: TelegramCloudService) {}

    @OnEvent(TELEGRAM_CLOUD_EVENTS.UPLOAD_FILE, { async: true })
    async handleUploadFile(file: Express.Multer.File, request: TelegramUploadDocumentRequest): Promise<void> {
        await this.telegramCloudService.uploadFile(file, request);
    }
}
