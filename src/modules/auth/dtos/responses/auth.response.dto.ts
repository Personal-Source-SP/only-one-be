import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

export class SignInResponseDto {
    @ApiProperty()
    @AutoMap()
    id: string;

    @ApiProperty()
    @AutoMap()
    email: string;

    @ApiProperty()
    @AutoMap()
    firstName: string;

    @ApiProperty()
    @AutoMap()
    lastName: string;

    @ApiProperty()
    @AutoMap()
    accessToken: string;

    @ApiProperty()
    @AutoMap()
    refreshToken: string;
}

export class RefreshTokenResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    refreshToken: string;
}
