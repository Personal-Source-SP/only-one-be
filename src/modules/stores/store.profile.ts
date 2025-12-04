import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { StoreItemDto } from './dtos/store-item.dto';
import { StoreDto } from './dtos/store.dto';
import { CreateStoreRequest, UpdateStoreRequest } from './dtos/requests';
import { StoreItemEntity } from './entities/store-item.entity';
import { StoreEntity } from './entities/store.entity';

@Injectable()
export class StoreProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, StoreEntity, StoreDto);
            createMap(mapper, StoreItemEntity, StoreItemDto);

            createMap(mapper, CreateStoreRequest, StoreEntity);
            createMap(mapper, UpdateStoreRequest, StoreEntity);
        };
    }
}
