import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UploadedFile,
    UseGuards,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { ApiFile } from '../../../decorators';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CloudDataItemDto } from '../dtos/cloud-data-item.dto';
import { CloudDataUploadFileRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { CloudDataItemEntity } from '../entities/cloud-data-item.entity';
import { CloudDataItemService } from '../services/cloud-data-item.service';

@Controller('cloud-data-items')
@ApiTags('Cloud Data Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CloudDataItemController extends BaseController<CloudDataItemEntity, CloudDataItemDto> {
    constructor(private readonly cloudDataItemService: CloudDataItemService) {
        super(cloudDataItemService);
    }

    @ApiOperation({ summary: 'Download file by cloud data item id' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Get(':id/download')
    @BaseApiOkResponse(String)
    async downloadFile(@Param('id', new ParseUUIDPipe()) id: string): Promise<string> {
        const fileResponse = await this.cloudDataItemService.getFileUrl(id);
        return fileResponse;
    }

    @ApiOperation({ summary: 'Upload file to cloud data' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('upload')
    @ApiFile({ description: 'File to upload' })
    @BaseApiOkResponse(UploadFileResponse)
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() request: CloudDataUploadFileRequest): Promise<UploadFileResponse> {
        if (!file) throw new BadRequestException('No file uploaded');

        const response = await this.cloudDataItemService.uploadFile(file, request);
        return response;
    }

    @ApiOperation({ summary: 'Upload file to cloud data from URL' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('upload-from-url')
    @BaseApiOkResponse(UploadFileResponse)
    async uploadFileFromUrl(@Body() request: CloudDataUploadFileRequest): Promise<UploadFileResponse> {
        const response = await this.cloudDataItemService.uploadFileFromUrl(request);
        return response;
    }
}
