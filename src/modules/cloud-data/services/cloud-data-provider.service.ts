import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { CloudDataProviderDto } from '../dtos/cloud-data-provider.dto';
import { CreateCloudDataProviderRequest, UpdateCloudDataProviderRequest } from '../dtos/requests';
import { CloudDataProviderEntity } from '../entities/cloud-data-provider.entity';

@Injectable()
export class CloudDataProviderService extends BaseService<CloudDataProviderEntity, CloudDataProviderDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(CloudDataProviderEntity) cloudDataProviderRepository: Repository<CloudDataProviderEntity>,
    ) {
        super(cloudDataProviderRepository, mapper, CloudDataProviderDto, CloudDataProviderService.name);
    }

    async create(request: CreateCloudDataProviderRequest): Promise<CloudDataProviderDto> {
        const entity = this.mapper.map(request, CreateCloudDataProviderRequest, CloudDataProviderEntity);
        return super.create(entity);
    }

    async update(id: string, request: UpdateCloudDataProviderRequest): Promise<boolean> {
        const cloudDataProviderExists = await this.exists({ id });
        if (!cloudDataProviderExists) throw new BadRequestException(`Cloud data provider with id ${id} not found`);

        return super.update(id, request);
    }
}
