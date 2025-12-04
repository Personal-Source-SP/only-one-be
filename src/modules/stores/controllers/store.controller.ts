import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    UploadedFile,
    UseGuards,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { ApiFile } from '../../../decorators';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CreateStoreRequest, StoreUploadFileRequest, UpdateStoreRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { StoreDto } from '../dtos/store.dto';
import { StoreEntity } from '../entities/store.entity';
import { StoreService } from '../services/store.service';

@Controller('store')
@ApiTags('Store')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
export class StoreController extends BaseController<StoreEntity, StoreDto> {
    constructor(private readonly storeService: StoreService) {
        super(storeService);
    }

    @ApiOperation({ summary: 'Create store' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post()
    @BaseApiOkResponse(StoreDto)
    async create(@Body() request: CreateStoreRequest): Promise<StoreDto> {
        const result = await this.storeService.create(request);
        return result;
    }

    @ApiOperation({ summary: 'Upload file to store' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('upload/:storeId')
    @ApiFile({ description: 'File to upload' })
    @BaseApiOkResponse(UploadFileResponse)
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Param('storeId', new ParseUUIDPipe()) storeId: string,
        @Body() request: StoreUploadFileRequest,
    ): Promise<UploadFileResponse> {
        if (!file) throw new BadRequestException('No file uploaded');

        const response = await this.storeService.uploadFile(file, storeId, request);
        return response;
    }

    @ApiOperation({ summary: 'Update store' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Put(':id')
    @BaseApiOkResponse(Boolean)
    async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() request: UpdateStoreRequest): Promise<boolean> {
        const result = await this.storeService.update(id, request);
        return result;
    }
}
