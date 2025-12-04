import { AxiosRequestConfig } from 'axios';
import { HttpMethod } from '../../../common/enums';
import { TelegramUploadDocumentRequest } from '../dtos/requests';

export interface ITelegramDocument {
    fileId: string;
    fileUniqueId: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    filePath?: string;
}

export interface ITelegramFile {
    fileId: string;
    fileUniqueId: string;
    fileSize?: number;
    filePath?: string;
}

export interface ITelegramRequest {
    endpoint: string;
    method: HttpMethod;
    file?: Express.Multer.File;
    uploadRequest?: TelegramUploadDocumentRequest;
    options: {
        messageId?: number;
        config?: AxiosRequestConfig;
    };
}

export interface ITelegramApiResponse<T> {
    ok: boolean;
    result: T;
    errorCode?: number;
    description?: string;
}
