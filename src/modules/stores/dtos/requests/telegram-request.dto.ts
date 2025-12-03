import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TelegramParseMode } from '../../enums';

export class TelegramUploadDocumentRequest {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    chatId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    caption?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(TelegramParseMode)
    parseMode?: TelegramParseMode;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    replyToMessageId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    disableNotification?: boolean;
}
