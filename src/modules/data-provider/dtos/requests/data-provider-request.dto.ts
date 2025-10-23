import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateNested } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../common/dto/pagination-request.dto';
import { ScraperServiceEnum } from '../../enums';

export class CreateDataProviderRequestDto {
    @ApiPropertyOptional({ description: 'Identifier must contain only letters, numbers, and dashes' })
    @IsString()
    @AutoMap()
    @MaxLength(255)
    @Matches(/^[a-z0-9-]+$/, { message: 'Identifier can only contain lowercase letters, numbers, and dashes' })
    identifier?: string;

    @ApiProperty()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    name: string;

    @ApiProperty()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    baseUrl: string;
}

export class UpdateDataProviderRequestDto {
    @ApiPropertyOptional({ description: 'Data Provider name' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    name?: string;

    @ApiPropertyOptional({ description: 'Identifier for the data provider' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Matches(/^[a-z0-9-]+$/, { message: 'Identifier can only contain lowercase letters, numbers, and dashes' })
    @AutoMap()
    identifier?: string;

    @ApiPropertyOptional({ description: 'Scraper service type to use' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    scraperService?: string;

    @ApiPropertyOptional({ description: 'Base URL of the Data Provider' })
    @IsOptional()
    @MaxLength(255)
    @IsUrl()
    @AutoMap()
    baseUrl?: string;
}

export class UpdateTargetConfigRequestDto {
    @ApiPropertyOptional({ enum: ScraperServiceEnum, default: ScraperServiceEnum.GENERIC })
    @IsOptional()
    @IsEnum(ScraperServiceEnum)
    scraperService?: ScraperServiceEnum;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    functionGenerator?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    mainContentSelector?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isGetParentElement?: boolean;
}

export class DataProviderPaginationFilterDto {
    @ApiPropertyOptional({ description: 'Filter by name' })
    @IsOptional()
    @IsString()
    name?: string;
}

export class DataProviderPaginationRequestDto extends BasePaginationRequestDto<DataProviderPaginationFilterDto> {
    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested({ always: true })
    @Type(() => DataProviderPaginationFilterDto)
    filter?: DataProviderPaginationFilterDto;
}
