import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class SignUpRequestDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @Length(1, 50)
    firstName?: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Length(1, 50)
    lastName?: string;

    @ApiProperty()
    @IsString()
    email: string;

    @ApiProperty()
    @IsString()
    password: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    phoneNumber?: string;
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
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    refreshToken: string;
}
