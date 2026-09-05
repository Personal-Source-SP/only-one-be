import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
import { ItemDto } from '../dtos/item.dto';
import { CreateItemRequestDto, UpdateItemRequestDto } from '../dtos/requests';
import { ItemEntity } from '../entities/item.entity';

@Injectable()
export class ItemService extends BaseService<ItemEntity, ItemDto> {
    constructor(@InjectMapper() mapper: Mapper, @InjectRepository(ItemEntity) itemRepository: Repository<ItemEntity>) {
        super(itemRepository, mapper, ItemDto, ItemService.name);
    }

    async create(request: CreateItemRequestDto): Promise<ItemDto> {
        // Check if item with same code already exists
        if (request.code) {
            const existingItem = await this.count({ code: request.code });
            if (existingItem > 0) {
                throw new AppException(DataProviderError.ItemWithCodeAlreadyExists(request.code));
            }
        }

        const entity = this.mapper.map(request, CreateItemRequestDto, ItemEntity);

        return await super.create(entity);
    }

    async updateItem(id: string, request: UpdateItemRequestDto): Promise<boolean> {
        const existingItem = await this.exists({ id });
        if (!existingItem) {
            this.loggerService.error(`No item found with id ${id}`);
            throw new AppException(DataProviderError.ItemNotFound(id));
        }

        // Check if code is being updated and if it already exists
        if (request.code !== undefined) {
            const existing = await this.count({ code: request.code, id: Not(id) });
            if (existing > 0) {
                this.loggerService.error(`Item with code ${request.code} already exists`);
                throw new AppException(DataProviderError.ItemWithCodeAlreadyExists(request.code));
            }
        }

        return await super.update(id, request);
    }
}
