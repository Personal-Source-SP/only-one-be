import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Res,
    UploadedFile,
    UseGuards,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { BaseController } from '../../../common/base.controller';
import { ApiFile } from '../../../decorators';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TelegramUploadDocumentRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { StoreDto } from '../dtos/store.dto';
import { StoreEntity } from '../entities/store.entity';
import { StoreType } from '../enums';
import { StoreService } from '../services/store.service';

@Controller('stores')
@ApiTags('stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class StoresController extends BaseController<StoreEntity, StoreDto> {
    constructor(private readonly storeService: StoreService) {
        super(storeService);
    }

    @ApiOperation({ summary: 'View Telegram stored file via proxy' })
    @Version('1')
    @Get('telegram/:fileId/view')
    async viewTelegramFile(@Param('fileId') fileId: string, @Res() res: Response): Promise<void> {
        const fileResponse = await this.storeService.getFileStream(fileId, { storeType: StoreType.TELEGRAM });

        const { data, headers, fileName } = fileResponse;

        const contentType = headers['content-type'] || 'application/octet-stream';
        const contentLength = headers['content-length'];

        res.setHeader('Content-Type', contentType);

        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        );

        res.send(data);
    }

    @ApiOperation({ summary: 'Upload file to Telegram store' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('telegram/upload')
    @ApiFile({ description: 'Telegram file to upload' })
    @BaseApiOkResponse(UploadFileResponse)
    async uploadTelegramFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() request: TelegramUploadDocumentRequest,
    ): Promise<UploadFileResponse> {
        if (!file) throw new BadRequestException('No file uploaded');

        const response = await this.storeService.uploadFile(file, { storeType: StoreType.TELEGRAM, payload: request });
        return response;
    }
}
