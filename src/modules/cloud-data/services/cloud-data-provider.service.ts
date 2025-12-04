import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { CLOUD_DATA_SERVICE_MAP } from '../constants';
import { CloudDataProviderDto } from '../dtos/cloud-data-provider.dto';
import { CloudDataUploadFileRequest, CreateCloudDataProviderRequest, UpdateCloudDataProviderRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { CloudDataProviderEntity } from '../entities/cloud-data-provider.entity';
import { ICloudDataService } from '../interfaces';
import { CloudDataItemService } from './cloud-data-item.service';

@Injectable()
export class CloudDataProviderService extends BaseService<CloudDataProviderEntity, CloudDataProviderDto> {
    constructor(
        private readonly cloudDataItemService: CloudDataItemService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(CloudDataProviderEntity) cloudDataProviderRepository: Repository<CloudDataProviderEntity>,
        @Inject(CLOUD_DATA_SERVICE_MAP)
        private readonly cloudDataServiceMap: Record<string, ICloudDataService>,
    ) {
        super(cloudDataProviderRepository, mapper, CloudDataProviderDto, CloudDataProviderService.name);
    }

    async create(request: CreateCloudDataProviderRequest): Promise<CloudDataProviderDto> {
        this.ensureCloudDataService(request.type);

        const entity = this.mapper.map(request, CreateCloudDataProviderRequest, CloudDataProviderEntity);
        return super.create(entity);
    }

    async update(id: string, request: UpdateCloudDataProviderRequest): Promise<boolean> {
        const cloudDataProviderExists = await this.exists({ id });
        if (!cloudDataProviderExists) throw new BadRequestException(`Cloud data provider with id ${id} not found`);

        if (request.type) {
            this.ensureCloudDataService(request.type);
        }

        return super.update(id, request);
    }

    async uploadFile(
        file: Express.Multer.File,
        cloudDataProviderId: string,
        request?: CloudDataUploadFileRequest,
    ): Promise<UploadFileResponse> {
        const { payload } = request ?? {};

        const cloudDataProvider = await this.findById(cloudDataProviderId);
        if (!cloudDataProvider) throw new BadRequestException(`Cloud data provider with id ${cloudDataProviderId} not found`);

        const cloudDataService = this.cloudDataServiceMap[cloudDataProvider.type];
        if (!cloudDataService) throw new BadRequestException(`Cloud data service for type ${cloudDataProvider.type} not found`);

        const response = await cloudDataService.uploadFile(file, payload);
        if (!response.isSuccess || !response.data?.document) throw new BadRequestException(response.errorMessage);

        const { pathUrl, document } = response.data;
        const { fileId, fileName, mimeType, fileSize } = document ?? {};
        const cloudDataItemEntity = this.cloudDataItemService.repository.create({
            cloudDataProviderId,
            fileName,
            mimeType,
            fileSize,
            pathUrl,
            pathId: fileId,
        });

        const savedCloudDataItem = await this.cloudDataItemService.create(cloudDataItemEntity);
        if (!savedCloudDataItem) throw new BadRequestException('Failed to save cloud data item');

        return response.data;
    }

    private ensureCloudDataService(cloudDataType: string): void {
        const cloudDataService = this.cloudDataServiceMap[cloudDataType];
        if (!cloudDataService) throw new BadRequestException(`Cloud data service for type ${cloudDataType} not found`);
    }
}
