import { BadRequestException, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import FormData from 'form-data';
import * as path from 'path';
import { HttpMethod } from '../../../../common/enums';
import { ICloudflareConfig, ITelegramConfig } from '../../../../shared/interfaces';
import { AppConfigService } from '../../../../shared/services/app-config.service';
import { BaseHttpService } from '../../../../shared/services/base-http.service';
import { LocalFileService } from '../../../../shared/services/local-file.service';
import { LoggerService } from '../../../../shared/services/logger.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { TelegramUploadDocumentRequest } from '../../dtos/requests';
import { FileStreamResponse, UploadFileResponse } from '../../dtos/responses';
import { TelegramEndpoint } from '../../enums';
import { ICloudDataService, ICloudDataServiceResponse, ITelegramApiResponse, ITelegramFile, ITelegramRequest } from '../../interfaces';

@Injectable()
export class TelegramCloudService implements ICloudDataService {
    private readonly telegramConfig: ITelegramConfig;
    private readonly cloudflareConfig: ICloudflareConfig;

    private readonly logger = new LoggerService(TelegramCloudService.name);

    constructor(
        private readonly baseHttpService: BaseHttpService,
        private readonly appConfigService: AppConfigService,
        private readonly localFileService: LocalFileService,
    ) {
        this.telegramConfig = this.appConfigService.telegramConfig;
        this.cloudflareConfig = this.appConfigService.cloudflareConfig;
    }

    async uploadFile(
        file: Express.Multer.File,
        request?: TelegramUploadDocumentRequest,
    ): Promise<ICloudDataServiceResponse<UploadFileResponse>> {
        const { messageId } = request ?? {};

        const endpoint = messageId ? TelegramEndpoint.EDIT_MESSAGE_MEDIA : TelegramEndpoint.SEND_DOCUMENT;

        try {
            const result = await this.callTelegramApi<UploadFileResponse>({
                file,
                endpoint,
                uploadRequest: request,
                method: HttpMethod.POST,
                options: {
                    messageId,
                },
            });

            if (result?.document?.fileId) {
                try {
                    const fileInfo = await this.fetchFileInfo(result.document.fileId);
                    const pathUrl = `${this.cloudflareConfig.workerDomain}/${fileInfo.filePath}`;

                    result.pathUrl = pathUrl;
                } catch (error) {
                    this.logger.error(`Failed to fetch file info for updated message ${result.messageId}: ${error.message || error}`);
                    return {
                        isSuccess: false,
                        errorMessage: error.message || 'Failed to fetch file info',
                    };
                }
            }

            return {
                data: result,
                isSuccess: true,
            };
        } catch (error) {
            return {
                isSuccess: false,
                errorMessage: error.message || 'Failed to upload file',
            };
        }
    }

    async uploadFileFromUrl(
        fileUrl: string,
        request?: TelegramUploadDocumentRequest,
    ): Promise<ICloudDataServiceResponse<UploadFileResponse>> {
        try {
            const file = await this.downloadFileFromUrl(fileUrl);
            return await this.uploadFile(file, request);
        } catch (error) {
            this.logger.error(`Failed to upload file from URL ${fileUrl}: ${error.message || error}`);
            return {
                isSuccess: false,
                errorMessage: error.message || 'Failed to upload file from URL',
            };
        }
    }

    async getFileStream(fileId: string): Promise<ICloudDataServiceResponse<FileStreamResponse>> {
        const fileInfo = await this.fetchFileInfo(fileId);

        if (!fileInfo.filePath) {
            this.logger.error(`File path is missing for file ${fileId}`);
            throw new BadRequestException('Requested file does not have a downloadable path');
        }

        try {
            const url = `${this.telegramConfig.fileBaseUrl}/${fileInfo.filePath}`;
            const response = await this.baseHttpService.get<ArrayBuffer>(url, {
                responseType: 'arraybuffer',
            });

            const contentType = (response.headers?.['content-type'] as string) || 'application/octet-stream';
            const fileNameFromPath = fileInfo.filePath.split('/').pop();

            let normalizedFileName = fileNameFromPath;
            if (!normalizedFileName.includes('.')) {
                const extensionMap: Record<string, string> = {
                    'application/pdf': 'pdf',
                    'image/jpeg': 'jpg',
                    'image/png': 'png',
                    'image/gif': 'gif',
                    'image/webp': 'webp',
                    'video/mp4': 'mp4',
                    'audio/mpeg': 'mp3',
                };

                const ext = extensionMap[contentType];
                if (ext) {
                    normalizedFileName = `${normalizedFileName}.${ext}`;
                }
            }

            const result = new FileStreamResponse({
                headers: response.headers,
                filePath: fileInfo.filePath,
                fileName: normalizedFileName,
                data: Buffer.from(response.data),
            });

            return {
                data: result,
                isSuccess: true,
            };
        } catch (error) {
            return {
                isSuccess: false,
                errorMessage: error.message || 'Failed to get file stream',
            };
        }
    }

    private buildDocumentFormData(file: Express.Multer.File, request?: TelegramUploadDocumentRequest, messageId?: number): FormData {
        const { chatId, caption, parseMode, replyToMessageId, disableNotification } = request ?? {};

        const filePayload = file.buffer?.length ? file.buffer : file.stream;
        if (!filePayload) {
            this.logger.error('Uploaded file payload is empty');
            throw new BadRequestException('Uploaded file payload is empty');
        }

        const form = new FormData();

        const targetChatId = chatId || this.telegramConfig.defaultChannelId;
        form.append('chat_id', targetChatId);

        if (messageId) {
            const mediaPayload: Record<string, unknown> = {
                type: 'document',
                media: 'attach://document',
            };

            if (caption) {
                mediaPayload.caption = caption;
            }

            if (parseMode) {
                mediaPayload.parse_mode = parseMode;
            }

            form.append('message_id', messageId.toString());
            form.append('media', JSON.stringify(mediaPayload));
        } else {
            if (caption) {
                form.append('caption', caption);
            }

            if (parseMode) {
                form.append('parse_mode', parseMode);
            }

            if (typeof replyToMessageId === 'number') {
                form.append('reply_to_message_id', replyToMessageId.toString());
            }
        }

        form.append('document', filePayload, {
            contentType: file.mimetype,
            filename: file.originalname,
        });

        if (typeof disableNotification === 'boolean') {
            form.append('disable_notification', disableNotification ? 'true' : 'false');
        }

        return form;
    }

    private extractTelegramResult<T>(payload: ITelegramApiResponse<T>, method: string): T {
        if (!payload?.ok || !payload.result) {
            const errorMessage = payload?.description || `Telegram ${method} failed`;
            this.logger.error(errorMessage);

            throw new BadRequestException(errorMessage);
        }

        return UtilsService.convertSnakeToCamelCase(payload.result);
    }

    private extractFileNameFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileName = pathname.split('/').pop() || '';

            if (fileName && fileName.includes('.')) {
                return decodeURIComponent(fileName);
            }

            return '';
        } catch (error) {
            this.logger.error(`Failed to extract filename from URL ${url}: ${error.message || error}`);
            return '';
        }
    }

    private async fetchFileInfo(fileId: string): Promise<ITelegramFile> {
        const fileInfo = await this.callTelegramApi<ITelegramFile>({
            method: HttpMethod.GET,
            endpoint: TelegramEndpoint.GET_FILE,
            options: {
                config: {
                    params: { fileId },
                },
            },
        });

        if (!fileInfo.filePath) {
            this.logger.error(`File path is missing for file ${fileId}`);
            throw new BadRequestException('Requested file does not have a downloadable path');
        }

        return fileInfo;
    }

    private async callTelegramApi<T>(request: ITelegramRequest): Promise<T> {
        const { endpoint, method, file, uploadRequest, options } = request;
        const { messageId, config } = options;

        const url = `${this.telegramConfig.apiBaseUrl}/${endpoint}`;

        let form: FormData;
        if (file) {
            form = this.buildDocumentFormData(file, uploadRequest, messageId);
        }

        let response: AxiosResponse<ITelegramApiResponse<T>>;

        switch (method) {
            case HttpMethod.POST: {
                response = await this.baseHttpService.post<ITelegramApiResponse<T>>(url, form, {
                    headers: form ? form.getHeaders() : undefined,
                    ...UtilsService.convertCamelToSnakeCase(config),
                });
                break;
            }

            case HttpMethod.GET: {
                response = await this.baseHttpService.get<ITelegramApiResponse<T>>(url, {
                    ...UtilsService.convertCamelToSnakeCase(config),
                });
                break;
            }

            default: {
                this.logger.error(`Invalid HTTP method: ${method}`);
                throw new BadRequestException('Invalid HTTP method');
            }
        }

        return this.extractTelegramResult<T>(response.data, endpoint);
    }

    private async downloadFileFromUrl(fileUrl: string): Promise<Express.Multer.File> {
        const isLocalFile = !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://');

        if (isLocalFile) {
            return await this.readLocalFile(fileUrl);
        }

        const response = await this.baseHttpService.get<ArrayBuffer>(fileUrl, {
            responseType: 'arraybuffer',
        });

        const contentType = (response.headers?.['content-type'] as string) || 'application/octet-stream';
        const contentDisposition = response.headers?.['content-disposition'] as string;

        let fileName = this.extractFileNameFromUrl(fileUrl);

        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/['"]/g, '');
            }
        }

        if (!fileName || !fileName.includes('.')) {
            const extensionMap: Record<string, string> = {
                'application/pdf': 'pdf',
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'image/webp': 'webp',
                'video/mp4': 'mp4',
                'audio/mpeg': 'mp3',
                'application/json': 'json',
                'text/plain': 'txt',
                'application/zip': 'zip',
            };

            const ext = extensionMap[contentType] || 'bin';
            fileName = fileName ? `${fileName}.${ext}` : `file.${ext}`;
        }

        const fileBuffer = Buffer.from(response.data);

        return {
            path: '',
            stream: null,
            destination: '',
            encoding: '7bit',
            fieldname: 'document',
            filename: fileName,
            originalname: fileName,
            buffer: fileBuffer,
            mimetype: contentType,
            size: fileBuffer.length,
        };
    }

    private async readLocalFile(filePath: string): Promise<Express.Multer.File> {
        try {
            const fileExists = await this.localFileService.fileExists(filePath);
            if (!fileExists) {
                throw new BadRequestException(`File not found: ${filePath}`);
            }

            const fileBuffer = (await this.localFileService.readFile(filePath)) as Buffer;
            const fileName = path.basename(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const contentType = this.localFileService.getMimeTypeFromExtension(ext);

            return {
                path: filePath,
                stream: null,
                destination: '',
                encoding: '7bit',
                fieldname: 'document',
                filename: fileName,
                originalname: fileName,
                buffer: fileBuffer,
                mimetype: contentType,
                size: fileBuffer.length,
            };
        } catch (error) {
            this.logger.error(`Failed to read local file ${filePath}: ${error.message || error}`);
            throw new BadRequestException(`Failed to read local file: ${error.message || error}`);
        }
    }
}
