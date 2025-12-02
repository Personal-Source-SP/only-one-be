import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TelegramParseMode } from '../../enums';

type TelegramFilePayload = Buffer | NodeJS.ReadableStream;

export class TelegramUploadDocumentRequest {
    @ApiProperty()
    @IsNotEmpty()
    file: TelegramFilePayload;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    fileName: string;

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
    @IsString()
    mimeType?: string;

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

export class TelegramUpdateDocumentRequest {
    @ApiProperty()
    @IsNotEmpty()
    file: TelegramFilePayload;

    @ApiProperty()
    @IsNotEmpty()
    fileName: string;

    @ApiProperty()
    @IsNotEmpty()
    messageId: number;

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
    @IsString()
    mimeType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(TelegramParseMode)
    parseMode?: TelegramParseMode;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    disableNotification?: boolean;
}
