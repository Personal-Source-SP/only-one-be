import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { IFindOptions } from '../../../common/interfaces/base-service.interface';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { CreateDataProviderItemRequestDto, UpdateDataProviderItemRequestDto } from '../dtos/requests';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderService } from './data-provider.service';
import { ItemService } from './item.service';

@Injectable()
export class DataProviderItemService extends BaseService<DataProviderItemEntity, DataProviderItemDto> {
    constructor(
        private readonly itemService: ItemService,

        @Inject(forwardRef(() => DataProviderService))
        private readonly dataProviderService: DataProviderService,

        @InjectMapper() mapper: Mapper,
        @InjectRepository(DataProviderItemEntity) dataProviderItemRepository: Repository<DataProviderItemEntity>,
    ) {
        super(dataProviderItemRepository, mapper, DataProviderItemDto);
    }

    async findOneByFilterAndOptions(
        filter: FindOptionsWhere<DataProviderItemEntity>,
        options?: IFindOptions<DataProviderItemEntity>,
    ): Promise<DataProviderItemDto> {
        const queryBuilder = this.repository
            .createQueryBuilder('dataProviderItem')
            .leftJoinAndSelect('dataProviderItem.dataProvider', 'dataProvider')
            .where(filter);

        // Build query builder with options
        this.buildQueryBuilder(queryBuilder, options);

        try {
            const result = await queryBuilder.getOne();
            if (!result) return null;

            return this.mapEntityToDto(result) as DataProviderItemDto;
        } catch (error) {
            this.handleError(error);
        }
    }

    async create(request: CreateDataProviderItemRequestDto): Promise<DataProviderItemDto> {
        // Verify that product exists
        const item = await this.itemService.exists({ id: request.itemId });
        if (!item) {
            throw new NotFoundException(`Item with ID ${request.itemId} not found`);
        }

        // Verify that data provider exists and get its details for validation
        const dataProvider = await this.dataProviderService.findOneByFilter(
            { id: request.dataProviderId },
            { select: { id: true, baseUrl: true } },
        );

        // Validate that product URL matches data provider base URL
        const isValidUrl = await this.validateItemUrlMatchesBaseUrl(request.itemUrl, dataProvider.baseUrl);
        if (!isValidUrl) {
            throw new BadRequestException(
                `Product URL must start with data provider base URL. Expected: ${dataProvider.baseUrl}, Got: ${request.itemUrl}`,
            );
        }

        const entity = this.mapper.map(request, CreateDataProviderItemRequestDto, DataProviderItemEntity);

        return await super.create(entity);
    }

    async update(id: string, request: UpdateDataProviderItemRequestDto): Promise<boolean> {
        const existing = await this.findOneByFilter({ id }, { relations: { dataProvider: true } });
        if (!existing) throw new NotFoundException('DataProviderItem with ID not found');

        // Verify product exists if updating
        if (request.itemId) {
            const itemExists = await this.itemService.exists({ id: request.itemId });
            if (!itemExists) throw new NotFoundException(`Item with ID ${request.itemId} not found`);
        }

        let dataProvider = existing.dataProvider;
        if (request.dataProviderId) {
            dataProvider = await this.dataProviderService.findOneByFilter(
                { id: request.dataProviderId },
                { select: { id: true, baseUrl: true } },
            );

            if (!dataProvider) throw new NotFoundException(`Data Provider with ID ${request.dataProviderId} not found`);
        }

        if (request.itemUrl) {
            const isValidUrl = this.validateItemUrlMatchesBaseUrl(request.itemUrl, dataProvider.baseUrl);
            if (!isValidUrl) {
                throw new BadRequestException(
                    `Item URL must start with data provider base URL. Expected: ${dataProvider.baseUrl}, Got: ${request.itemUrl}`,
                );
            }
        }

        return await super.update(id, request);
    }

    async updateItemUrlByDataProviderId(dataProviderId: string, newBaseUrl: string): Promise<boolean> {
        const dataProvider = await this.dataProviderService.findOneByFilter(
            { id: dataProviderId },
            { select: { id: true, baseUrl: true } },
        );

        if (!dataProvider) throw new NotFoundException(`Data Provider with ID ${dataProviderId} not found`);

        const dataProviderItems = await this.findListByFilter({ dataProviderId }, { relations: { item: true } });
        if (!dataProviderItems.length) throw new NotFoundException(`Data Provider Item with Data Provider ID ${dataProviderId} not found`);

        for (const dataProviderItem of dataProviderItems) {
            dataProviderItem.itemUrl = this.updateItemUrlWithBaseUrl(dataProviderItem.itemUrl, dataProvider.baseUrl, newBaseUrl);
        }

        try {
            const updated = await this.repository.save(dataProviderItems);
            return updated.length > 0;
        } catch (error) {
            this.handleError(error);
        }
    }

    async switchActiveStatus(id: string, activeStatus: boolean): Promise<boolean> {
        const existing = await this.findOneByFilter({ id });
        if (!existing) throw new NotFoundException('DataProviderItem with ID not found');

        return await super.update(id, { isActive: activeStatus });
    }

    private validateItemUrlMatchesBaseUrl(itemUrl: string, baseUrl: string): boolean {
        return itemUrl.startsWith(baseUrl);
    }

    private updateItemUrlWithBaseUrl(itemUrl: string, oldBaseUrl: string, newBaseUrl: string): string {
        return itemUrl.replace(oldBaseUrl, newBaseUrl);
    }
}
