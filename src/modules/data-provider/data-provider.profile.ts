import { createMap, forMember, mapFrom, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { ConfigVersionDto } from './dtos/config-version.dto';
import { ScrapingDataDto } from './dtos/scraping-data.dto';
import { DataProviderItemDto } from './dtos/data-provider-item.dto';
import { DataProviderDto } from './dtos/data-provider.dto';
import { ItemDto } from './dtos/item.dto';
import {
    CreateConfigVersionRequestDto,
    CreateScrapingDataRequestDto,
    CreateDataProviderItemRequestDto,
    CreateDataProviderRequestDto,
    CreateItemRequestDto,
    UpdateDataProviderItemRequestDto,
    UpdateDataProviderRequestDto,
    UpdateItemRequestDto,
} from './dtos/requests';
import { ConfigVersionEntity } from './entities/config-version.entity';
import { ScrapingDataEntity } from './entities/scraping-data.entity';
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
            createMap(
                mapper,
                DataProviderEntity,
                DataProviderDto,
                forMember(
                    (d) => d.targetConfig,
                    mapFrom((s) => s.targetConfig),
                ),
                forMember(
                    (d) => d.searchConfig,
                    mapFrom((s) => s.searchConfig),
                ),
            );
            createMap(mapper, CreateDataProviderRequestDto, DataProviderEntity);
            createMap(mapper, UpdateDataProviderRequestDto, DataProviderEntity);

            createMap(mapper, DataProviderItemEntity, DataProviderItemDto);
            createMap(mapper, CreateDataProviderItemRequestDto, DataProviderItemEntity);
            createMap(mapper, UpdateDataProviderItemRequestDto, DataProviderItemEntity);

            createMap(mapper, ScrapingDataEntity, ScrapingDataDto);
            createMap(
                mapper,
                CreateScrapingDataRequestDto,
                ScrapingDataEntity,
                forMember(
                    (d) => d.scrapeTimestamp,
                    mapFrom((s) => new Date()),
                ),
            );

            createMap(mapper, ItemEntity, ItemDto);
            createMap(mapper, ItemDto, ItemEntity);
            createMap(mapper, CreateItemRequestDto, ItemEntity);
            createMap(mapper, UpdateItemRequestDto, ItemEntity);

            createMap(mapper, ConfigVersionEntity, ConfigVersionDto);
            createMap(mapper, CreateConfigVersionRequestDto, ConfigVersionEntity);
        };
    }
}
