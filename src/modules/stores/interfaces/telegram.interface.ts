import { TelegramUpdateDocumentRequest, TelegramUploadDocumentRequest } from '../dtos/requests';

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

export interface ITelegramApiResponse<T> {
    ok: boolean;
    result: T;
    error_code?: number;
    description?: string;
}

export interface ITelegramFormData {
    chatId: string;
    isUpdate: boolean;
    request: TelegramUploadDocumentRequest | TelegramUpdateDocumentRequest;
}
