import { BadRequestException, Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';

import { AppConfigService } from '../../../shared/services/app-config.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { TelegramUpdateDocumentRequest, TelegramUploadDocumentRequest } from '../dtos/requests';
import { TelegramMessageResponse } from '../dtos/responses';
import { ITelegramApiResponse, ITelegramFile } from '../interfaces';

@Injectable()
export class TelegramStoreService {
    private readonly logger = new LoggerService(TelegramStoreService.name);

    private readonly botToken: string;
    private readonly apiBaseUrl: string;
    private readonly fileBaseUrl: string;
    private readonly defaultChatId: string;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly baseHttpService: BaseHttpService,
    ) {
        this.botToken = this.appConfigService.get('TELEGRAM_BOT_TOKEN');
        this.defaultChatId = this.appConfigService.get('TELEGRAM_CHANNEL_ID');

        this.apiBaseUrl = this.botToken ? `https://api.telegram.org/bot${this.botToken}` : '';
        this.fileBaseUrl = this.botToken ? `https://api.telegram.org/file/bot${this.botToken}` : '';
    }

    async uploadFile(request: TelegramUploadDocumentRequest): Promise<TelegramMessageResponse> {
        const chatId = this.ensureBaseConfig(request.chatId);
        const form = new FormData();

        form.append('chat_id', chatId);
        form.append('document', request.file, {
            filename: request.fileName,
            contentType: request.mimeType,
        });

        if (request.caption) {
            form.append('caption', request.caption);
        }

        if (request.parseMode) {
            form.append('parse_mode', request.parseMode);
        }

        if (typeof request.replyToMessageId === 'number') {
            form.append('reply_to_message_id', request.replyToMessageId.toString());
        }

        if (typeof request.disableNotification === 'boolean') {
            form.append('disable_notification', request.disableNotification ? 'true' : 'false');
        }

        return this.callTelegramApi<TelegramMessageResponse>('sendDocument', {
            method: 'post',
            body: form,
            config: {
                headers: form.getHeaders(),
            },
        });
    }

    async updateFile(request: TelegramUpdateDocumentRequest): Promise<TelegramMessageResponse> {
        const chatId = this.ensureBaseConfig(request.chatId);

        if (!request.messageId) {
            this.logger.error('messageId is required to update a Telegram file');
            throw new BadRequestException('messageId is required');
        }

        const form = new FormData();
        const mediaPayload: Record<string, unknown> = {
            type: 'document',
            media: 'attach://document',
        };

        if (request.caption) {
            mediaPayload.caption = request.caption;
        }

        if (request.parseMode) {
            mediaPayload.parse_mode = request.parseMode;
        }

        form.append('chat_id', chatId);
        form.append('message_id', request.messageId.toString());
        form.append('media', JSON.stringify(mediaPayload));
        form.append('document', request.file, {
            filename: request.fileName,
            contentType: request.mimeType,
        });

        if (typeof request.disableNotification === 'boolean') {
            form.append('disable_notification', request.disableNotification ? 'true' : 'false');
        }

        return this.callTelegramApi<TelegramMessageResponse>('editMessageMedia', {
            method: 'post',
            body: form,
            config: {
                headers: form.getHeaders(),
            },
        });
    }

    async getFileDownloadUrl(fileId: string): Promise<string> {
        const fileInfo = await this.fetchFileInfo(fileId);
        return `${this.fileBaseUrl}/${fileInfo.file_path}`;
    }

    async getFileBuffer(fileId: string): Promise<Buffer> {
        const fileInfo = await this.fetchFileInfo(fileId);
        const { data } = await this.baseHttpService.get<ArrayBuffer>(`${this.fileBaseUrl}/${fileInfo.file_path}`, {
            responseType: 'arraybuffer',
        });

        return Buffer.from(data);
    }

    private ensureBaseConfig(chatId?: string): string {
        if (!this.botToken || !this.apiBaseUrl || !this.fileBaseUrl) {
            this.logger.error('TELEGRAM_BOT_TOKEN is missing');
            throw new BadRequestException('TELEGRAM_BOT_TOKEN is required');
        }

        const targetChatId = chatId || this.defaultChatId;
        if (!targetChatId) {
            this.logger.error('TELEGRAM_CHANNEL_ID is missing');
            throw new BadRequestException('TELEGRAM_CHANNEL_ID is required');
        }

        return targetChatId;
    }

    private extractTelegramResult<T>(payload: ITelegramApiResponse<T>, method: string): T {
        if (!payload?.ok || !payload.result) {
            const errorMessage = payload?.description || `Telegram ${method} failed`;
            this.logger.error(errorMessage);
            throw new BadRequestException(errorMessage);
        }

        return payload.result;
    }

    private async fetchFileInfo(fileId: string): Promise<ITelegramFile> {
        this.ensureBaseConfig();

        const fileInfo = await this.callTelegramApi<ITelegramFile>('getFile', {
            method: 'get',
            config: {
                params: { file_id: fileId },
            },
        });

        if (!fileInfo.file_path) {
            this.logger.error(`File path is missing for file ${fileId}`);
            throw new BadRequestException('Requested file does not have a downloadable path');
        }

        return fileInfo;
    }

    private async callTelegramApi<T>(
        endpoint: string,
        options: {
            method: 'get' | 'post';
            body?: any;
            config?: AxiosRequestConfig;
        },
    ): Promise<T> {
        const url = `${this.apiBaseUrl}/${endpoint}`;
        const { method, body, config } = options;

        const { data } =
            method === 'post'
                ? await this.baseHttpService.post<ITelegramApiResponse<T>>(url, body, config)
                : await this.baseHttpService.get<ITelegramApiResponse<T>>(url, config);

        return this.extractTelegramResult(data, endpoint);
    }
}
