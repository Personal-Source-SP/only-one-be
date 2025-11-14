import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserRequestDto {
    @ApiProperty()
    @IsEmail()
    @AutoMap()
    email: string;

    @ApiProperty()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    userName: string;

    @ApiProperty()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    password: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    firstName?: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    lastName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @AutoMap()
    phoneNumber?: string;
}
