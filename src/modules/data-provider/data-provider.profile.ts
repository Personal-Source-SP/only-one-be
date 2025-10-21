import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { ConfigVersionDto } from './dtos/config-version.dto';
import { DataHistoryDto } from './dtos/data-history.dto';
import { DataProviderItemDto } from './dtos/data-provider-item.dto';
import { DataProviderDto } from './dtos/data-provider.dto';
import { ItemDto } from './dtos/item.dto';
import {
    CreateConfigVersionRequestDto,
    CreateDataHistoryRequestDto,
    CreateDataProviderItemRequestDto,
    CreateDataProviderRequestDto,
    CreateItemRequestDto,
    UpdateDataProviderItemRequestDto,
    UpdateDataProviderRequestDto,
    UpdateItemRequestDto,
} from './dtos/requests';
import { ConfigVersionEntity } from './entities/config-version.entity';
import { DataHistoryEntity } from './entities/data-history.entity';
import { DataProviderItemEntity } from './entities/data-provider-item.entity';
import { DataProviderEntity } from './entities/data-provider.entity';
import { ItemEntity } from './entities/item.entity';

@Injectable()
export class DataProviderProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, DataProviderEntity, DataProviderDto);
            createMap(mapper, DataProviderItemEntity, DataProviderItemDto);
            createMap(mapper, DataHistoryEntity, DataHistoryDto);
            createMap(mapper, ItemEntity, ItemDto);
            createMap(mapper, ConfigVersionEntity, ConfigVersionDto);

            // Request DTOs to Entity mappings
            createMap(mapper, CreateDataProviderRequestDto, DataProviderEntity);
            createMap(mapper, UpdateDataProviderRequestDto, DataProviderEntity);

            createMap(mapper, CreateDataProviderItemRequestDto, DataProviderItemEntity);
            createMap(mapper, UpdateDataProviderItemRequestDto, DataProviderItemEntity);

            createMap(mapper, CreateItemRequestDto, ItemEntity);
            createMap(mapper, UpdateItemRequestDto, ItemEntity);

            createMap(mapper, CreateDataHistoryRequestDto, DataHistoryEntity);

            createMap(mapper, CreateConfigVersionRequestDto, ConfigVersionEntity);
        };
    }
}
