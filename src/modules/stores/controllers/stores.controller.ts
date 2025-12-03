import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Res,
    UploadedFile,
    UseGuards,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { ApiFile } from '../../../decorators';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TelegramUploadDocumentRequest } from '../dtos/requests';
import { TelegramMessageResponse } from '../dtos/responses';
import { TelegramStoreService } from '../services/telegram-store.service';

@Controller('stores')
@ApiTags('stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class StoresController {
    constructor(private readonly telegramStoreService: TelegramStoreService) {}

    @ApiOperation({ summary: 'View Telegram stored file via proxy' })
    @Version('1')
    @Get('telegram/:fileId/view')
    async viewTelegramFile(@Param('fileId') fileId: string, @Res() res: Response): Promise<void> {
        const fileResponse = await this.telegramStoreService.getFileStream(fileId);

        const contentType = fileResponse.headers['content-type'] || 'application/octet-stream';
        const contentLength = fileResponse.headers['content-length'];

        res.setHeader('Content-Type', contentType);

        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileResponse.fileName)}"; filename*=UTF-8''${encodeURIComponent(
                fileResponse.fileName,
            )}`,
        );

        res.send(fileResponse.data);
    }

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
