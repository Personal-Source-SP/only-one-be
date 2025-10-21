import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { ItemDto } from '../dtos/item.dto';
import { CreateItemRequestDto, ItemPaginationRequestDto, UpdateItemRequestDto } from '../dtos/requests';
import { ItemEntity } from '../entities/item.entity';
import { ProductMappingStatus } from '../enums';
import { parseBooleanFilter, parseFilterValueToArray } from '../utils/query.utils';

@Injectable()
export class ItemService extends BaseService<ItemEntity> {
    constructor(
        private readonly loggerService: LoggerService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(ItemEntity)
        private readonly itemRepository: Repository<ItemEntity>,
    ) {
        super(itemRepository);
    }

    async getById(id: string): Promise<ItemDto> {
        const item = await this.findById(id);
        if (!item) {
            this.loggerService.error(`No item found with id ${id}`);
            return null;
        }

        return this.mapper.map(item, ItemEntity, ItemDto);
    }

    async getItemsPagination(query: ItemPaginationRequestDto, globalConfig: PaginateConfig<ItemEntity>): Promise<Paginated<ItemDto>> {
        try {
            const queryBuilder = this.itemRepository.createQueryBuilder('item');

            // Handle tags filter
            const tags = parseFilterValueToArray(query.filter?.tags);
            if (tags?.length) {
                queryBuilder.andWhere('item.tags::jsonb ?| ARRAY[:...tags]', { tags });
                delete query.filter.tags;
            }

            // Handle showDuplicates filter
            const showDuplicates = parseBooleanFilter(
                Array.isArray(query.filter?.showDuplicates) ? query.filter?.showDuplicates[0] : query.filter?.showDuplicates,
            );
            if (showDuplicates) {
                queryBuilder.andWhere(`
                    EXISTS (
                        SELECT 1 
                        FROM items i2 
                        WHERE i2.name = item.name 
                        AND i2.id != item.id
                    )
                `);
                delete query.filter.showDuplicates;
            }

            const paginatedResult: Paginated<ItemEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                queryBuilder,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, ItemEntity, ItemDto);
            return { ...paginatedResult, data } as Paginated<ItemDto>;
        } catch (error) {
            this.loggerService.error(`Get items pagination error: ${error?.message}`);
            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async createItem(request: CreateItemRequestDto): Promise<ItemDto> {
        try {
            // Check if item with same code already exists
            if (request.code) {
                const existingItem = await this.itemRepository.count({
                    where: { code: request.code },
                });

                if (existingItem > 0) {
                    throw new ConflictException(`Item with code ${request.code} already exists`);
                }
            }

            // Create the item
            const itemEntity = this.mapper.map(request, CreateItemRequestDto, ItemEntity);
            itemEntity.mappingStatus = ProductMappingStatus.UNMAPPED;

            const item = await this.itemRepository.save(itemEntity);
            return this.mapper.map(item, ItemEntity, ItemDto);
        } catch (error) {
            this.loggerService.error(`Create item error: ${error?.message}`);
            throw error;
        }
    }

    async updateItem(id: string, request: UpdateItemRequestDto): Promise<boolean> {
        const existingItem = await this.exists({ id });
        if (!existingItem) {
            this.loggerService.error(`No item found with id ${id}`);
            throw new NotFoundException('No item found with id');
        }

        // Check if code is being updated and if it already exists
        if (request.code !== undefined) {
            const existing = await this.itemRepository.count({ where: { code: request.code, id: Not(id) } });
            if (existing > 0) {
                this.loggerService.error(`Item with code ${request.code} already exists`);
                throw new ConflictException(`Item with code ${request.code} already exists`);
            }
        }

        const updatedItem = await this.update(id, request);
        return updatedItem;
    }

    async deleteItem(id: string): Promise<boolean> {
        const existingItem = await this.exists({ id });
        if (!existingItem) {
            this.loggerService.error(`No item found with id ${id}`);
            throw new NotFoundException('No item found with id');
        }

        return this.delete(id);
    }
}
