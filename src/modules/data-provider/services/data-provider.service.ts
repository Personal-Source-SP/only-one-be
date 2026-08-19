import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { IFindOptions } from '../../../common/interfaces/base-service.interface';
import { DataProviderDto } from '../dtos/data-provider.dto';
import { CreateDataProviderRequestDto, UpdateDataProviderRequestDto } from '../dtos/requests';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderItemService } from './data-provider-item.service';

@Injectable()
export class DataProviderService extends BaseService<DataProviderEntity, DataProviderDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DataProviderEntity) dataProviderRepository: Repository<DataProviderEntity>,

        @Inject(forwardRef(() => DataProviderItemService))
        private readonly dataProviderItemService: DataProviderItemService,
    ) {
        super(dataProviderRepository, mapper, DataProviderDto, DataProviderService.name);
    }

    async findById(id: string, options?: IFindOptions<DataProviderEntity>): Promise<DataProviderDto> {
        return await super.findById(id, {
            relations: { features: true },
            ...options,
        });
    }

    async create(data: CreateDataProviderRequestDto): Promise<DataProviderDto> {
        if (data?.identifier && !/^[a-z0-9-]+$/.test(data.identifier)) {
            throw new BadRequestException('Identifier must contain lowercase letters, numbers, and dashes');
        }

        if (data?.baseUrl) {
            const existingDataProviderWithBaseUrl = await this.exists({ baseUrl: data.baseUrl });

            if (existingDataProviderWithBaseUrl) {
                this.loggerService.error(`Data provider with baseUrl ${data.baseUrl} already exists`);
                throw new ConflictException(`Data provider with baseUrl ${data.baseUrl} already exists`);
            }
        }

        if (data?.identifier) {
            const existingDataProviderWithIdentifier = await this.exists({ identifier: data.identifier });

            if (existingDataProviderWithIdentifier) {
                this.loggerService.error(`Data provider with identifier ${data.identifier} already exists`);
                throw new ConflictException(`Data provider with identifier ${data.identifier} already exists`);
            }
        }

        const entity = this.mapper.map(data, CreateDataProviderRequestDto, DataProviderEntity);

        return await super.create(entity);
    }

    async update(id: string, data: UpdateDataProviderRequestDto): Promise<boolean> {
        const existingDataProvider = await this.findById(id);
        if (!existingDataProvider) {
            this.loggerService.error(`Data provider with ID ${id} not found`);
            throw new NotFoundException(`Data provider with ID ${id} not found`);
        }

        // Check if identifier is valid
        if (data?.identifier && !/^[a-z0-9-]+$/.test(data.identifier)) {
            throw new BadRequestException('Identifier must contain lowercase letters, numbers, and dashes');
        }

        // Check unique identifier
        if (data?.identifier) {
            const countExistingDataProvider = await this.exists({
                id: Not(id),
                identifier: data.identifier,
            });

            if (countExistingDataProvider) {
                this.loggerService.error(`Data provider with identifier ${data.identifier} already exists`);
                throw new ConflictException(`Data provider with identifier ${data.identifier} already exists`);
            }
        }

        // Check unique baseUrl
        if (data?.baseUrl) {
            const existingDataProviderWithBaseUrl = await this.exists({
                id: Not(id),
                baseUrl: data.baseUrl,
            });

            if (existingDataProviderWithBaseUrl) {
                this.loggerService.error(`Data provider with baseUrl ${data.baseUrl} already exists`);
                throw new ConflictException(`Data provider with baseUrl ${data.baseUrl} already exists`);
            }

            // Update item URL if base URL is changed
            if (existingDataProvider.baseUrl !== data.baseUrl) {
                await this.dataProviderItemService.updateItemUrlByDataProviderId(id, data.baseUrl);
            }
        }

        return await super.update(id, data);
    }
}
