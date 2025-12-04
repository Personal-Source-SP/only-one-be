import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { CloudDataItemDto } from '../dtos/cloud-data-item.dto';
import { CloudDataItemEntity } from '../entities/cloud-data-item.entity';

@Injectable()
export class CloudDataItemService extends BaseService<CloudDataItemEntity, CloudDataItemDto> {
    constructor(@InjectMapper() mapper: Mapper, @InjectRepository(CloudDataItemEntity) cloudDataItemRepository: Repository<CloudDataItemEntity>) {
        super(cloudDataItemRepository, mapper, CloudDataItemDto, CloudDataItemService.name);
    }

    async getFileUrl(id: string): Promise<string> {
        const cloudDataItem = await this.findById(id);
        if (!cloudDataItem) throw new BadRequestException(`Cloud data item with id ${id} not found`);

        return cloudDataItem.pathUrl;
    }
}
