import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { STORE_SERVICE_MAP } from '../constants';
import { StoreGetFileStreamRequest, StoreUploadFileRequest } from '../dtos/requests';
import { FileStreamResponse, UploadFileResponse } from '../dtos/responses';
import { StoreDto } from '../dtos/store.dto';
import { StoreEntity } from '../entities/store.entity';
import { IStoreService } from '../interfaces';

@Injectable()
export class StoreService extends BaseService<StoreEntity, StoreDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(StoreEntity) storeRepository: Repository<StoreEntity>,
        @Inject(STORE_SERVICE_MAP)
        private readonly storeServiceMap: Record<string, IStoreService>,
    ) {
        super(storeRepository, mapper, StoreDto, StoreService.name);
    }

    async uploadFile(file: Express.Multer.File, request: StoreUploadFileRequest): Promise<UploadFileResponse> {
        const { storeType, payload } = request;

        const storeService = this.storeServiceMap[storeType];
        if (!storeService) throw new BadRequestException(`Store service for type ${storeType} not found`);

        const response = await storeService.uploadFile(file, payload);
        if (!response.isSuccess) throw new BadRequestException(response.errorMessage);

        return response.data;
    }

    async getFileStream(fileId: string, request: StoreGetFileStreamRequest): Promise<FileStreamResponse> {
        const { storeType } = request;

        const storeService = this.storeServiceMap[storeType];
        if (!storeService) throw new BadRequestException(`Store service for type ${storeType} not found`);

        const response = await storeService.getFileStream(fileId);
        if (!response.isSuccess) throw new BadRequestException(response.errorMessage);

        return response.data;
    }
}
