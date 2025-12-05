import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { MimeType } from '../../../common/enums';
import { UtilsService } from '../../../shared/services/utils.service';
import { CLOUD_DATA_SERVICE_MAP } from '../constants';
import { CloudDataItemDto } from '../dtos/cloud-data-item.dto';
import { CloudDataUploadFileRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { CloudDataItemEntity } from '../entities/cloud-data-item.entity';
import { ICloudDataService } from '../interfaces';
import { CloudDataProviderService } from './cloud-data-provider.service';

@Injectable()
export class CloudDataItemService extends BaseService<CloudDataItemEntity, CloudDataItemDto> {
    constructor(
        private readonly cloudDataProviderService: CloudDataProviderService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(CloudDataItemEntity) cloudDataItemRepository: Repository<CloudDataItemEntity>,
        @Inject(CLOUD_DATA_SERVICE_MAP)
        private readonly cloudDataServiceMap: Record<string, ICloudDataService>,
    ) {
        super(cloudDataItemRepository, mapper, CloudDataItemDto, CloudDataItemService.name);
    }

    async getFileUrl(id: string): Promise<string> {
        const cloudDataItem = await this.findById(id);
        if (!cloudDataItem) throw new BadRequestException(`Cloud data item with id ${id} not found`);

        return cloudDataItem.pathUrl;
    }

    async uploadFile(file: Express.Multer.File, request: CloudDataUploadFileRequest): Promise<UploadFileResponse> {
        const { cloudDataProviderId, payload } = request;

        const cloudDataProvider = await this.cloudDataProviderService.findById(cloudDataProviderId);
        if (!cloudDataProvider) throw new BadRequestException(`Cloud data provider with id ${cloudDataProviderId} not found`);

        const cloudDataService = this.cloudDataServiceMap[cloudDataProvider.type];
        if (!cloudDataService) throw new BadRequestException(`Cloud data service for type ${cloudDataProvider.type} not found`);

        const response = await cloudDataService.uploadFile(file, payload);
        if (!response.isSuccess || !response.data?.document) throw new BadRequestException(response.errorMessage);

        const { pathUrl, document } = response.data;
        const { fileId, fileName, mimeType, fileSize } = document ?? {};
        const cloudDataItemEntity = this.repository.create({
            cloudDataProviderId,
            fileName,
            fileSize,
            pathUrl,
            pathId: fileId,
            mimeType: UtilsService.transformMimeType(mimeType),
        });

        const savedCloudDataItem = await this.create(cloudDataItemEntity);
        if (!savedCloudDataItem) throw new BadRequestException('Failed to save cloud data item');

        return {
            ...response.data,
            cloudDataItemId: savedCloudDataItem.id,
        };
    }

    async uploadFileFromUrl(request: CloudDataUploadFileRequest): Promise<UploadFileResponse> {
        const { cloudDataProviderId, fileUrl, payload } = request;

        const cloudDataProvider = await this.cloudDataProviderService.findById(cloudDataProviderId);
        if (!cloudDataProvider) throw new BadRequestException(`Cloud data provider with id ${cloudDataProviderId} not found`);

        const cloudDataService = this.cloudDataServiceMap[cloudDataProvider.type];
        if (!cloudDataService) throw new BadRequestException(`Cloud data service for type ${cloudDataProvider.type} not found`);

        const response = await cloudDataService.uploadFileFromUrl(fileUrl, payload);
        if (!response.isSuccess || !response.data?.document) throw new BadRequestException(response.errorMessage);

        const { pathUrl, document } = response.data;
        const { fileId, fileName, mimeType, fileSize } = document ?? {};
        const cloudDataItemEntity = this.repository.create({
            cloudDataProviderId,
            fileName,
            fileSize,
            pathUrl,
            pathId: fileId,
            mimeType: mimeType as MimeType,
        });

        const savedCloudDataItem = await this.create(cloudDataItemEntity);
        if (!savedCloudDataItem) throw new BadRequestException('Failed to save cloud data item');

        return {
            ...response.data,
            cloudDataItemId: savedCloudDataItem.id,
        };
    }
}
