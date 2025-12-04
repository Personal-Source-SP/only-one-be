import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { StoreDto } from '../dtos/store.dto';
import { StoreEntity } from '../entities/store.entity';

@Injectable()
export class StoreService extends BaseService<StoreEntity, StoreDto> {
    constructor(@InjectMapper() mapper: Mapper, @InjectRepository(StoreEntity) storeRepository: Repository<StoreEntity>) {
        super(storeRepository, mapper, StoreDto, StoreService.name);
    }
}
