import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { CreateSimulationContextRequest, CreateSimulationItemRequest } from './dtos/requests';
import { SimulationContextDto } from './dtos/simulation-context.dto';
import { SimulationItemDto } from './dtos/simulation-item.dto';
import { SimulationContextEntity } from './entities/simulation-context.entity';
import { SimulationItemEntity } from './entities/simulation-item.entity';

@Injectable()
export class SimulationProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, SimulationContextEntity, SimulationContextDto);
            createMap(mapper, SimulationItemEntity, SimulationItemDto);

            createMap(mapper, CreateSimulationContextRequest, SimulationContextEntity);
            createMap(mapper, CreateSimulationItemRequest, SimulationItemEntity);
        };
    }
}
