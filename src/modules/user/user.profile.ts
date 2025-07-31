import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { SignInResponseDto } from '../auth/dtos/responses/auth.response.dto';
import { CreateUserRequestDto, UpdateUserRequestDto } from './dtos/requests';
import { UserDto } from './dtos/user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, UserEntity, UserDto);
            createMap(mapper, UserEntity, SignInResponseDto);

            createMap(mapper, CreateUserRequestDto, UserEntity);
            createMap(mapper, UpdateUserRequestDto, UserEntity);
        };
    }
}
