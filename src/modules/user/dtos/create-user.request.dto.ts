import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationRequestDto } from '@/common/dto/pagination-request.dto';

import { UserRole } from '../entities/user.entity';

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
    @IsString()
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

export class UserQueryRequestDto extends PaginationRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(UserRole)
    @AutoMap()
    role?: UserRole;
}
