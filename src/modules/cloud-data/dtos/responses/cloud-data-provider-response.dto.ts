import { ApiResponseProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { ITelegramDocument } from '../../interfaces';

export class UploadFileResponse {
    @ApiResponseProperty()
    @IsNotEmpty()
    cloudDataItemId: string;

    @ApiResponseProperty()
    @IsNotEmpty()
    date: number;

    @ApiResponseProperty()
    @IsNotEmpty()
    messageId: number;

    @ApiResponseProperty()
    @IsOptional()
    pathUrl?: string;

    @ApiResponseProperty()
    @IsOptional()
    document?: ITelegramDocument;
}

export class FileStreamResponse {
    @ApiResponseProperty()
    @IsNotEmpty()
    data: Buffer;

    @ApiResponseProperty()
    @IsNotEmpty()
    headers: Record<string, any>;

    @ApiResponseProperty()
    @IsNotEmpty()
    filePath: string;

    @ApiResponseProperty()
    @IsNotEmpty()
    fileName: string;

    constructor(data: Partial<FileStreamResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
