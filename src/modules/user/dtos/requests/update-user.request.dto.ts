import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    lastName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    @AutoMap()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @AutoMap()
    phoneNumber?: string;
}
