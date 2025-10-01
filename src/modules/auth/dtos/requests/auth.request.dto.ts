import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class SignUpRequestDto {
    @ApiProperty()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    firstName: string;

    @ApiProperty()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    lastName: string;

    @ApiProperty()
    @IsString()
    @IsEmail()
    @AutoMap()
    email: string;

    @ApiProperty()
    @IsString()
    @AutoMap()
    password: string;

    @ApiProperty()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    phoneNumber: string;
}

export class SignInRequestDto {
    @ApiProperty()
    @IsString()
    email: string;

    @ApiProperty()
    @IsString()
    password: string;
}

export class RefreshTokenRequestDto {
    @ApiProperty()
    @IsString()
    refreshToken: string;
}
