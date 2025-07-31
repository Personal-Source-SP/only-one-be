import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { SignInResponseDto } from '../auth/dtos/auth.response.dto';
import { CreateUserRequestDto } from './dtos/create-user.request.dto';
import { UpdateUserRequestDto } from './dtos/update-user.request.dto';
import { UserDto } from './dtos/user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, CreateUserRequestDto, UserEntity);
            createMap(mapper, UserEntity, UserDto);
            createMap(mapper, UpdateUserRequestDto, UserEntity);
            createMap(mapper, UserEntity, SignInResponseDto);
        };
    }
}
