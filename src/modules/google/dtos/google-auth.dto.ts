import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';

export class GoogleAuthDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    userId: string;

    @ApiResponseProperty()
    @AutoMap()
    email: string;

    @ApiResponseProperty()
    @AutoMap()
    googleAccessToken: string;

    @ApiResponseProperty()
    @AutoMap()
    googleExpiresAt: Date;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    googleRefreshToken?: string;

    @ApiResponseProperty()
    @AutoMap()
    googleRefreshTokenExpiresAt?: Date;

    @ApiResponseProperty()
    @AutoMap()
    googleScope?: string;

    @ApiResponseProperty()
    @AutoMap()
    googleTokenType?: string;
}
