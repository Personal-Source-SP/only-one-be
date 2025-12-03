import { BadRequestException, Injectable } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';

import { HttpMethod } from '../../../common/enums';
import { ITelegramConfig } from '../../../shared/interfaces';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { TelegramUpdateDocumentRequest, TelegramUploadDocumentRequest } from '../dtos/requests';
import { TelegramMessageResponse } from '../dtos/responses';
import { ITelegramApiResponse, ITelegramFile, ITelegramFormData } from '../interfaces';

@Injectable()
export class TelegramStoreService {
    private readonly telegramConfig: ITelegramConfig;
    private readonly logger = new LoggerService(TelegramStoreService.name);

    constructor(
        private readonly baseHttpService: BaseHttpService,
        private readonly appConfigService: AppConfigService,
    ) {
        this.telegramConfig = this.appConfigService.telegramConfig;
    }

    async uploadFile(request: TelegramUploadDocumentRequest): Promise<TelegramMessageResponse> {
        const form = this.buildDocumentFormData({
            request,
            isUpdate: false,
            chatId: request.chatId,
        });

        return this.callTelegramApi<TelegramMessageResponse>('sendDocument', HttpMethod.POST, {
            body: form,
            config: {
                headers: form.getHeaders(),
            },
        });
    }

    async updateFile(request: TelegramUpdateDocumentRequest): Promise<TelegramMessageResponse> {
        if (typeof request.messageId !== 'number') {
            this.logger.error('messageId is required to update a Telegram file');
            throw new BadRequestException('messageId is required');
        }

        const form = this.buildDocumentFormData({
            request,
            isUpdate: true,
            chatId: request.chatId,
        });

        return this.callTelegramApi<TelegramMessageResponse>('editMessageMedia', HttpMethod.POST, {
            body: form,
            config: {
                headers: form.getHeaders(),
            },
        });
    }

    async getFileDownloadUrl(fileId: string): Promise<string> {
        const fileInfo = await this.fetchFileInfo(fileId);
        return `${this.telegramConfig.fileBaseUrl}/${fileInfo.file_path}`;
    }

    async getFileBuffer(fileId: string): Promise<Buffer> {
        const fileInfo = await this.fetchFileInfo(fileId);
        const { data } = await this.baseHttpService.get<ArrayBuffer>(`${this.telegramConfig.fileBaseUrl}/${fileInfo.file_path}`, {
            responseType: 'arraybuffer',
        });

        return Buffer.from(data);
    }

    private ensureBaseConfig(chatId?: string): string {
        if (!this.telegramConfig) {
            this.logger.error('TELEGRAM_API_BASE_URL is missing');
            throw new BadRequestException('TELEGRAM_API_BASE_URL is required');
        }

        const targetChatId = chatId || this.telegramConfig.defaultChannelId;
        if (!targetChatId) {
            this.logger.error('TELEGRAM_DEFAULT_CHANNEL_ID is missing');
            throw new BadRequestException('TELEGRAM_DEFAULT_CHANNEL_ID is required');
        }

        return targetChatId;
    }

    private buildDocumentFormData(options: ITelegramFormData): FormData {
        const { chatId, request, isUpdate } = options;

        const form = new FormData();

        const targetChatId = this.ensureBaseConfig(chatId);
        form.append('chat_id', targetChatId);

        if (isUpdate) {
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

            form.append('message_id', (request as TelegramUpdateDocumentRequest).messageId!.toString());
            form.append('media', JSON.stringify(mediaPayload));
        } else {
            if (request.caption) {
                form.append('caption', request.caption);
            }

            if (request.parseMode) {
                form.append('parse_mode', request.parseMode);
            }

            if (typeof (request as TelegramUploadDocumentRequest).replyToMessageId === 'number') {
                form.append('reply_to_message_id', (request as TelegramUploadDocumentRequest).replyToMessageId.toString());
            }
        }

        form.append('document', request.file, {
            filename: request.fileName,
            contentType: request.mimeType,
        });

        if (typeof request.disableNotification === 'boolean') {
            form.append('disable_notification', request.disableNotification ? 'true' : 'false');
        }

        return form;
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

        const fileInfo = await this.callTelegramApi<ITelegramFile>('getFile', HttpMethod.GET, {
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
        method: HttpMethod,
        options: {
            body?: any;
            config?: AxiosRequestConfig;
        },
    ): Promise<T> {
        const { body, config } = options;

        const url = `${this.telegramConfig.apiBaseUrl}/${endpoint}`;

        let response: AxiosResponse<ITelegramApiResponse<T>>;

        switch (method) {
            case HttpMethod.POST: {
                response = await this.baseHttpService.post<ITelegramApiResponse<T>>(url, body, config);
                break;
            }

            case HttpMethod.GET: {
                response = await this.baseHttpService.get<ITelegramApiResponse<T>>(url, config);
                break;
            }

            default: {
                this.logger.error(`Invalid HTTP method: ${method}`);
                throw new BadRequestException('Invalid HTTP method');
            }
        }

        return this.extractTelegramResult(response.data, endpoint);
    }
}
