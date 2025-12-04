import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { CloudDataItemDto } from './dtos/cloud-data-item.dto';
import { CloudDataProviderDto } from './dtos/cloud-data-provider.dto';
import { CreateCloudDataProviderRequest, UpdateCloudDataProviderRequest } from './dtos/requests';
import { CloudDataItemEntity } from './entities/cloud-data-item.entity';
import { CloudDataProviderEntity } from './entities/cloud-data-provider.entity';

@Injectable()
export class CloudDataProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, CloudDataProviderEntity, CloudDataProviderDto);
            createMap(mapper, CloudDataItemEntity, CloudDataItemDto);

            createMap(mapper, CreateCloudDataProviderRequest, CloudDataProviderEntity);
            createMap(mapper, UpdateCloudDataProviderRequest, CloudDataProviderEntity);
        };
    }
}
