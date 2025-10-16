import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { GoogleAuthDto } from '../../google/dtos/google-auth.dto';

export class UserDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    email: string;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    firstName?: string;

    @ApiResponseProperty()
    @AutoMap()
    lastName?: string;

    @ApiResponseProperty()
    @AutoMap()
    phoneNumber?: string;

    @ApiResponseProperty()
    @AutoMap(() => [GoogleAuthDto])
    googleAuths: GoogleAuthDto[];
}
