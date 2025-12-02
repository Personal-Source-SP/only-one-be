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
