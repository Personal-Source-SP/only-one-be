import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { StoreItemDto } from '../dtos/store-item.dto';
import { StoreItemEntity } from '../entities/store-item.entity';

@Injectable()
export class StoreItemService extends BaseService<StoreItemEntity, StoreItemDto> {
    constructor(@InjectMapper() mapper: Mapper, @InjectRepository(StoreItemEntity) storeItemRepository: Repository<StoreItemEntity>) {
        super(storeItemRepository, mapper, StoreItemDto, StoreItemService.name);
    }

    async getFileUrl(id: string): Promise<string> {
        const storeItem = await this.findById(id);
        if (!storeItem) throw new BadRequestException(`Store item with id ${id} not found`);

        return storeItem.pathUrl;
    }
}
