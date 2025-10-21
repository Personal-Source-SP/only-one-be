import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../common/dto/pagination-request.dto';

export class CreateItemRequestDto {
    @ApiProperty()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    @AutoMap()
    code?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @AutoMap()
    tags?: string[];
}

export class UpdateItemRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    @AutoMap()
    code?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @AutoMap()
    tags?: string[];
}

export class FilterItemPaginationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    showDuplicates?: boolean;
}

export class ItemPaginationRequestDto extends BasePaginationRequestDto<FilterItemPaginationDto> {
    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested({ always: true })
    @Type(() => FilterItemPaginationDto)
    filter?: FilterItemPaginationDto;
}
