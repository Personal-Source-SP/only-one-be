import { createMap, forMember, mapFrom, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { ConfigVersionDto } from './dtos/config-version.dto';
import { DataProviderDto } from './dtos/data-provider.dto';
import { DataProviderFeatureDto } from './dtos/data-provider-feature.dto';
import { DataProviderItemDto } from './dtos/data-provider-item.dto';
import { ItemDto } from './dtos/item.dto';
import {
    CreateConfigVersionRequestDto,
    CreateDataProviderFeatureRequestDto,
    CreateDataProviderItemRequestDto,
    CreateDataProviderRequestDto,
    CreateItemRequestDto,
    CreateScrapingDataRequestDto,
    UpdateDataProviderItemRequestDto,
    UpdateDataProviderRequestDto,
    UpdateItemRequestDto,
} from './dtos/requests';
import { ScrapingDataDto } from './dtos/scraping-data.dto';
import { ConfigVersionEntity } from './entities/config-version.entity';
import { DataProviderEntity } from './entities/data-provider.entity';
import { DataProviderFeatureEntity } from './entities/data-provider-feature.entity';
import { DataProviderItemEntity } from './entities/data-provider-item.entity';
import { ItemEntity } from './entities/item.entity';
import { ScrapingDataEntity } from './entities/scraping-data.entity';

@Injectable()
export class DataProviderProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, DataProviderEntity, DataProviderDto);
            createMap(mapper, CreateDataProviderRequestDto, DataProviderEntity);
            createMap(mapper, UpdateDataProviderRequestDto, DataProviderEntity);

            createMap(
                mapper,
                DataProviderFeatureEntity,
                DataProviderFeatureDto,
                forMember(
                    (d) => d.config,
                    mapFrom((s) => s.config),
                ),
            );
            createMap(mapper, CreateDataProviderFeatureRequestDto, DataProviderFeatureEntity);

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

            createMap(
                mapper,
                ConfigVersionEntity,
                ConfigVersionDto,
                forMember(
                    (d) => d.config,
                    mapFrom((s) => s.config),
                ),
            );
            createMap(mapper, CreateConfigVersionRequestDto, ConfigVersionEntity);
        };
    }
}
