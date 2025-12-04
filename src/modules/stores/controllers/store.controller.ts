import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { ApiFile } from '../../../decorators';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { StoreUploadFileRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { StoreDto } from '../dtos/store.dto';
import { StoreEntity } from '../entities/store.entity';
import { StoreService } from '../services/store.service';

@Controller('store')
@ApiTags('store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class StoreController extends BaseController<StoreEntity, StoreDto> {
    constructor(private readonly storeService: StoreService) {
        super(storeService);
    }

    @ApiOperation({ summary: 'Upload file to store' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('upload')
    @ApiFile({ description: 'File to upload' })
    @BaseApiOkResponse(UploadFileResponse)
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() request: StoreUploadFileRequest): Promise<UploadFileResponse> {
        if (!file) throw new BadRequestException('No file uploaded');

        const response = await this.storeService.uploadFile(file, request);
        return response;
    }
}
