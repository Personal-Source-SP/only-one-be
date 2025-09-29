import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { CreateSettingRequestDto, UpdateSettingRequestDto } from './dtos/requests/setting-request.dto';
import { SettingDto } from './dtos/setting.dto';
import { SettingEntity } from './entities/setting.entity';

@Injectable()
export class SettingProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, SettingEntity, SettingDto);
            createMap(mapper, CreateSettingRequestDto, SettingEntity);
            createMap(mapper, UpdateSettingRequestDto, SettingEntity);
        };
    }
}
