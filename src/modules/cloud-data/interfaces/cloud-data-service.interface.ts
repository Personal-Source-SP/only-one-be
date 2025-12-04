import { TelegramUploadDocumentRequest } from '../dtos/requests';
import { FileStreamResponse, UploadFileResponse } from '../dtos/responses';

export interface ICloudDataServiceResponse<T> {
    isSuccess: boolean;
    data?: T;
    errorMessage?: string;
}

type UpdateFileRequest = TelegramUploadDocumentRequest;

export interface ICloudDataService {
    getFileStream(fileId: string): Promise<ICloudDataServiceResponse<FileStreamResponse>>;
    uploadFile(file: Express.Multer.File, request?: UpdateFileRequest): Promise<ICloudDataServiceResponse<UploadFileResponse>>;
}
