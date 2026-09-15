import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { NetworkDeviceDto } from './dtos/network-device.dto';
import { NetworkDeviceEntity } from './entities/network-device.entity';

@Injectable()
export class NetworkDeviceProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, NetworkDeviceEntity, NetworkDeviceDto);
        };
    }
}
