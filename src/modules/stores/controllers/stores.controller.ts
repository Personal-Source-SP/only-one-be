import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    UploadedFile,
    UseGuards,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TelegramUpdateDocumentRequest, TelegramUploadDocumentRequest } from '../dtos/requests';
import { TelegramMessageResponse } from '../dtos/responses';
import { TelegramStoreService } from '../services/telegram-store.service';
import { ApiFile } from '../../../decorators';

@Controller('stores')
@ApiTags('stores')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
export class StoresController {
    constructor(private readonly telegramStoreService: TelegramStoreService) {}

    @ApiOperation({
        summary: 'Upload file to Telegram store',
        description: 'Upload file to Telegram store and return the message ID',
    })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('telegram/upload')
    @ApiFile({ description: 'Telegram file to upload' })
    @BaseApiOkResponse(TelegramMessageResponse)
    async uploadTelegramFile(
        @UploadedFile() file: Express.Multer.File,
        // @Body() request: TelegramUploadDocumentRequest,
    ): Promise<TelegramMessageResponse> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const response = await this.telegramStoreService.uploadFile({
            file: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype,
            caption: file.originalname,
            // chatId: file.originalname,
            disableNotification: false,
        });

        return response;
    }

    @ApiOperation({
        summary: 'Update existing Telegram stored file',
        description: 'Update existing Telegram stored file and return the message ID',
    })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('telegram/:messageId/update')
    @ApiFile({ description: 'Telegram file to update' })
    @BaseApiOkResponse(TelegramMessageResponse)
    async updateTelegramFile(
        @Param('messageId', ParseIntPipe) messageId: number,
        @UploadedFile() file: Express.Multer.File,
        @Body() request: TelegramUpdateDocumentRequest,
    ): Promise<TelegramMessageResponse> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const response = await this.telegramStoreService.updateFile({
            file: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype,
            messageId,
            caption: request.caption,
            chatId: request.chatId,
            disableNotification: request.disableNotification,
        });

        return response;
    }
}
