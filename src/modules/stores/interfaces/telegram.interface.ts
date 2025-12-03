import { AxiosRequestConfig } from 'axios';
import { HttpMethod } from '../../../common/enums';
import { TelegramUploadDocumentRequest } from '../dtos/requests';

export interface ITelegramDocument {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
}

export interface ITelegramFile {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
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
