import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { STORE_SERVICE_MAP } from '../constants';
import { CreateStoreRequest, StoreUploadFileRequest, UpdateStoreRequest } from '../dtos/requests';
import { UploadFileResponse } from '../dtos/responses';
import { StoreDto } from '../dtos/store.dto';
import { StoreEntity } from '../entities/store.entity';
import { IStoreService } from '../interfaces';
import { StoreItemService } from './store-item.service';

@Injectable()
export class StoreService extends BaseService<StoreEntity, StoreDto> {
    constructor(
        private readonly storeItemService: StoreItemService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(StoreEntity) storeRepository: Repository<StoreEntity>,
        @Inject(STORE_SERVICE_MAP)
        private readonly storeServiceMap: Record<string, IStoreService>,
    ) {
        super(storeRepository, mapper, StoreDto, StoreService.name);
    }

    async create(request: CreateStoreRequest): Promise<StoreDto> {
        this.ensureStoreService(request.type);

        const entity = this.mapper.map(request, CreateStoreRequest, StoreEntity);
        const createdStore = await super.create(entity);
        if (!createdStore) throw new BadRequestException('Failed to create store');

        return createdStore;
    }

    async uploadFile(file: Express.Multer.File, request: StoreUploadFileRequest): Promise<UploadFileResponse> {
        const { storeId, payload } = request;

        const store = await this.findById(storeId);
        if (!store) throw new BadRequestException(`Store with id ${storeId} not found`);

        const storeService = this.storeServiceMap[store.type];
        if (!storeService) throw new BadRequestException(`Store service for type ${store.type} not found`);

        const response = await storeService.uploadFile(file, payload);
        if (!response.isSuccess || !response.data?.document) throw new BadRequestException(response.errorMessage);

        const { pathUrl, document } = response.data;
        const { fileId, fileName, mimeType, fileSize } = document ?? {};
        const storeItemEntity = this.storeItemService.repository.create({
            storeId,
            fileName,
            mimeType,
            fileSize,
            pathUrl,
            pathId: fileId,
        });

        const savedStoreItem = await this.storeItemService.create(storeItemEntity);
        if (!savedStoreItem) throw new BadRequestException('Failed to save store item');

        return response.data;
    }

    async update(id: string, request: UpdateStoreRequest): Promise<boolean> {
        const store = await this.findById(id);
        if (!store) throw new BadRequestException(`Store with id ${id} not found`);

        if (request.type) {
            this.ensureStoreService(request.type);
        }

        const isUpdated = await super.update(id, request);
        if (!isUpdated) throw new BadRequestException('Failed to update store');

        return isUpdated;
    }

    private ensureStoreService(storeType: string): void {
        const storeService = this.storeServiceMap[storeType];
        if (!storeService) throw new BadRequestException(`Store service for type ${storeType} not found`);
    }
}
