import { BadRequestException, Body, Controller, UploadedFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { ApiFile, Auth, GetRestApi, PostRestApi, UUIDParam } from '../../../decorators';
import { CloudDataItemDto } from '../dtos/cloud-data-item.dto';
import { CloudDataUploadFileRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { CloudDataItemEntity } from '../entities/cloud-data-item.entity';
import { CloudDataItemService } from '../services/cloud-data-item.service';

@Controller('cloud-data-items')
@ApiTags('Cloud Data Items')
@Auth()
export class CloudDataItemController extends BaseController<CloudDataItemEntity, CloudDataItemDto> {
    constructor(private readonly cloudDataItemService: CloudDataItemService) {
        super(cloudDataItemService);
    }

    @GetRestApi({
        path: ':id/download',
        summary: 'Download file by cloud data item id',
        responseDto: String,
    })
    async downloadFile(@UUIDParam('id') id: string): Promise<string> {
        const fileResponse = await this.cloudDataItemService.getFileUrl(id);
        return fileResponse;
    }

    @PostRestApi({
        path: 'upload',
        summary: 'Upload file to cloud data',
        responseDto: UploadFileResponse,
    })
    @ApiFile({ description: 'File to upload' })
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() request: CloudDataUploadFileRequest): Promise<UploadFileResponse> {
        if (!file) throw new BadRequestException('No file uploaded');

        const response = await this.cloudDataItemService.uploadFile(file, request);
        return response;
    }

    @PostRestApi({
        path: 'upload-from-url',
        summary: 'Upload file to cloud data from URL',
        responseDto: UploadFileResponse,
    })
    async uploadFileFromUrl(@Body() request: CloudDataUploadFileRequest): Promise<UploadFileResponse> {
        const response = await this.cloudDataItemService.uploadFileFromUrl(request);
        return response;
    }
}
