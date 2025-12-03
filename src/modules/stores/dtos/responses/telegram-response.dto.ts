import { ApiResponseProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { ITelegramDocument } from '../../interfaces';

export class TelegramMessageResponse {
    @ApiResponseProperty()
    @IsNotEmpty()
    date: number;

    @ApiResponseProperty()
    @IsNotEmpty()
    messageId: number;

    @ApiResponseProperty()
    @IsOptional()
    document?: ITelegramDocument;
}

export class TelegramFileStreamResponse {
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

    constructor(data: Partial<TelegramFileStreamResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
