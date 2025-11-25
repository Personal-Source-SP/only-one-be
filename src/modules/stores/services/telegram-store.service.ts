import { BadRequestException, Injectable } from '@nestjs/common';
import FormData from 'form-data';

import { AppConfigService } from '../../../shared/services/app-config.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';

type TelegramFilePayload = Buffer | NodeJS.ReadableStream;

type TelegramParseMode = 'MarkdownV2' | 'Markdown' | 'HTML';

interface ITelegramApiResponse<T> {
    ok: boolean;
    result: T;
    error_code?: number;
    description?: string;
}

interface ITelegramDocument {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
}

interface ITelegramFile {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
}

interface ITelegramMessage {
    date: number;
    message_id: number;
    document?: ITelegramDocument;
}

interface ITelegramUpdateDocumentParams {
    file: TelegramFilePayload;
    fileName: string;
    messageId: number;
    chatId?: string;
    caption?: string;
    mimeType?: string;
    parseMode?: TelegramParseMode;
    disableNotification?: boolean;
}

interface ITelegramUploadDocumentParams {
    file: TelegramFilePayload;
    fileName: string;
    chatId?: string;
    caption?: string;
    mimeType?: string;
    parseMode?: TelegramParseMode;
    replyToMessageId?: number;
    disableNotification?: boolean;
}

@Injectable()
export class TelegramStoreService {
    private readonly logger = new LoggerService(TelegramStoreService.name);

    private readonly apiBaseUrl: string;

    private readonly botToken: string;

    private readonly defaultChatId: string;

    private readonly fileBaseUrl: string;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly baseHttpService: BaseHttpService,
    ) {
        this.botToken = this.appConfigService.get('TELEGRAM_BOT_TOKEN');
        this.defaultChatId = this.appConfigService.get('TELEGRAM_CHANNEL_ID');

        this.apiBaseUrl = this.botToken ? `https://api.telegram.org/bot${this.botToken}` : '';
        this.fileBaseUrl = this.botToken ? `https://api.telegram.org/file/bot${this.botToken}` : '';
    }

    public uploadFile = async (params: ITelegramUploadDocumentParams): Promise<ITelegramMessage> => {
        const chatId = this.ensureBaseConfig(params.chatId);
        const form = new FormData();

        form.append('chat_id', chatId);
        form.append('document', params.file, {
            filename: params.fileName,
            contentType: params.mimeType,
        });

        if (params.caption) {
            form.append('caption', params.caption);
        }

        if (params.parseMode) {
            form.append('parse_mode', params.parseMode);
        }

        if (typeof params.replyToMessageId === 'number') {
            form.append('reply_to_message_id', params.replyToMessageId.toString());
        }

        if (typeof params.disableNotification === 'boolean') {
            form.append('disable_notification', params.disableNotification ? 'true' : 'false');
        }

        const { data } = await this.baseHttpService.post<ITelegramApiResponse<ITelegramMessage>>(`${this.apiBaseUrl}/sendDocument`, form, {
            headers: form.getHeaders(),
        });

        return this.extractTelegramResult(data, 'sendDocument');
    };

    public updateFile = async (params: ITelegramUpdateDocumentParams): Promise<ITelegramMessage> => {
        const chatId = this.ensureBaseConfig(params.chatId);

        if (!params.messageId) {
            this.logger.error('messageId is required to update a Telegram file');
            throw new BadRequestException('messageId is required');
        }

        const form = new FormData();
        const mediaPayload: Record<string, unknown> = {
            type: 'document',
            media: 'attach://document',
        };

        if (params.caption) {
            mediaPayload.caption = params.caption;
        }

        if (params.parseMode) {
            mediaPayload.parse_mode = params.parseMode;
        }

        form.append('chat_id', chatId);
        form.append('message_id', params.messageId.toString());
        form.append('media', JSON.stringify(mediaPayload));
        form.append('document', params.file, {
            filename: params.fileName,
            contentType: params.mimeType,
        });

        if (typeof params.disableNotification === 'boolean') {
            form.append('disable_notification', params.disableNotification ? 'true' : 'false');
        }

        const { data } = await this.baseHttpService.post<ITelegramApiResponse<ITelegramMessage>>(
            `${this.apiBaseUrl}/editMessageMedia`,
            form,
            {
                headers: form.getHeaders(),
            },
        );

        return this.extractTelegramResult(data, 'editMessageMedia');
    };

    public getFileDownloadUrl = async (fileId: string): Promise<string> => {
        const fileInfo = await this.fetchFileInfo(fileId);
        return `${this.fileBaseUrl}/${fileInfo.file_path}`;
    };

    public getFileBuffer = async (fileId: string): Promise<Buffer> => {
        const fileInfo = await this.fetchFileInfo(fileId);
        const { data } = await this.baseHttpService.get<ArrayBuffer>(`${this.fileBaseUrl}/${fileInfo.file_path}`, {
            responseType: 'arraybuffer',
        });

        return Buffer.from(data);
    };

    private ensureBaseConfig = (chatId?: string): string => {
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
    };

    private fetchFileInfo = async (fileId: string): Promise<ITelegramFile> => {
        this.ensureBaseConfig();

        const { data } = await this.baseHttpService.get<ITelegramApiResponse<ITelegramFile>>(`${this.apiBaseUrl}/getFile`, {
            params: { file_id: fileId },
        });

        const fileInfo = this.extractTelegramResult(data, 'getFile');

        if (!fileInfo.file_path) {
            this.logger.error(`File path is missing for file ${fileId}`);
            throw new BadRequestException('Requested file does not have a downloadable path');
        }

        return fileInfo;
    };

    private extractTelegramResult = <T>(payload: ITelegramApiResponse<T>, method: string): T => {
        if (!payload?.ok || !payload.result) {
            const errorMessage = payload?.description || `Telegram ${method} failed`;
            this.logger.error(errorMessage);
            throw new BadRequestException(errorMessage);
        }

        return payload.result;
    };
}
