import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { ItemDto } from '../dtos/item.dto';
import { CreateItemRequestDto, UpdateItemRequestDto } from '../dtos/requests';
import { ItemEntity } from '../entities/item.entity';

@Injectable()
export class ItemService extends BaseService<ItemEntity, ItemDto> {
    constructor(
        private readonly loggerService: LoggerService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ItemEntity) itemRepository: Repository<ItemEntity>,
    ) {
        super(itemRepository, mapper);
    }

    async create(request: CreateItemRequestDto): Promise<ItemDto> {
        // Check if item with same code already exists
        if (request.code) {
            const existingItem = await this.count({ code: request.code });
            if (existingItem > 0) {
                throw new ConflictException(`Item with code ${request.code} already exists`);
            }
        }

        return await super.create(request);
    }

    async updateItem(id: string, request: UpdateItemRequestDto): Promise<boolean> {
        const existingItem = await this.exists({ id });
        if (!existingItem) {
            this.loggerService.error(`No item found with id ${id}`);
            throw new NotFoundException('No item found with id');
        }

        // Check if code is being updated and if it already exists
        if (request.code !== undefined) {
            const existing = await this.count({ code: request.code, id: Not(id) });
            if (existing > 0) {
                this.loggerService.error(`Item with code ${request.code} already exists`);
                throw new ConflictException(`Item with code ${request.code} already exists`);
            }
        }

        return await super.update(id, request);
    }
}
