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
    Version,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiFile } from '../../../decorators';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { TelegramUploadDocumentRequest } from '../dtos/requests';
import { TelegramMessageResponse } from '../dtos/responses';
import { TelegramStoreService } from '../services/telegram-store.service';

@Controller('stores')
@ApiTags('stores')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
export class StoresController {
    constructor(private readonly telegramStoreService: TelegramStoreService) {}

    @ApiOperation({ summary: 'Upload file to Telegram store' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('telegram/upload')
    @ApiFile({ description: 'Telegram file to upload' })
    @BaseApiOkResponse(TelegramMessageResponse)
    async uploadTelegramFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() request: TelegramUploadDocumentRequest,
    ): Promise<TelegramMessageResponse> {
        if (!file) throw new BadRequestException('No file uploaded');

        const response = await this.telegramStoreService.uploadFile(file, request);
        return response;
    }

    @ApiOperation({ summary: 'Update existing Telegram stored file' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('telegram/:messageId/update')
    @ApiFile({ description: 'Telegram file to update' })
    @BaseApiOkResponse(TelegramMessageResponse)
    async updateTelegramFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() request: TelegramUploadDocumentRequest,
        @Param('messageId', new ParseIntPipe()) messageId: number,
    ): Promise<TelegramMessageResponse> {
        if (!file) throw new BadRequestException('No file uploaded');

        const response = await this.telegramStoreService.uploadFile(file, request, messageId);
        return response;
    }
}
