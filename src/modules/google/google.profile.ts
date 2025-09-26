import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { GoogleAuthDto } from './dtos/google-auth.dto';
import { GoogleAuthEntity } from './entities/google-auth.entity';

@Injectable()
export class GoogleProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            this.registerGoogleAuthMappings(mapper);
        };
    }

    private registerGoogleAuthMappings(mapper: Mapper): void {
        createMap(mapper, GoogleAuthEntity, GoogleAuthDto);
    }
}
