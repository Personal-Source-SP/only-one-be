import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../common/dto/pagination-request.dto';

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

export class FilterUserPaginationDto {
    @ApiPropertyOptional({ description: 'Filter by email' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ description: 'Filter by user name' })
    @IsOptional()
    @IsString()
    userName?: string;
}

export class UserPaginationRequestDto extends BasePaginationRequestDto<FilterUserPaginationDto> {
    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested({ always: true })
    @Type(() => FilterUserPaginationDto)
    filter?: FilterUserPaginationDto;
}
