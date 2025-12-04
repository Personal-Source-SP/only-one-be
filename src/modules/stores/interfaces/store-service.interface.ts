import { TelegramUploadDocumentRequest } from '../dtos/requests';
import { FileStreamResponse, UploadFileResponse } from '../dtos/responses';

export interface IStoreServiceResponse<T> {
    isSuccess: boolean;
    data?: T;
    errorMessage?: string;
}

type UpdateFileRequest = TelegramUploadDocumentRequest;

export interface IStoreService {
    getFileStream(fileId: string): Promise<IStoreServiceResponse<FileStreamResponse>>;
    uploadFile(file: Express.Multer.File, request?: UpdateFileRequest): Promise<IStoreServiceResponse<UploadFileResponse>>;
}
