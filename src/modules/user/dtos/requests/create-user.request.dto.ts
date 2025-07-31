import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserRequestDto {
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
    @IsEmail()
    @AutoMap()
    email: string;

    @ApiProperty()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    password: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @AutoMap()
    phoneNumber?: string;
}
