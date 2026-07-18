import { createMap, forMember, mapFrom, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { UtilsService } from '../../shared/services/utils.service';
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

            createMap(
                mapper,
                CreateUserRequestDto,
                UserEntity,
                forMember(
                    (d) => d.password,
                    mapFrom((s) => UtilsService.generateHash(s.password)),
                ),
            );
            createMap(mapper, UpdateUserRequestDto, UserEntity);
        };
    }
}
