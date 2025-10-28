import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateNested } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../common/dto/pagination-request.dto';
import { ScraperServiceEnum } from '../../enums';

export class CreateDataProviderRequestDto {
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

    @ApiPropertyOptional({ description: 'Identifier must contain only letters, numbers, and dashes' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Matches(/^[a-z0-9-]+$/, { message: 'Identifier can only contain lowercase letters, numbers, and dashes' })
    @AutoMap()
    identifier?: string;
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

    @ApiPropertyOptional({ description: 'Query parameters to add to the request' })
    @IsOptional()
    @IsString()
    queryParams?: string;

    @ApiPropertyOptional({ description: 'Maximum number of results to return' })
    @IsOptional()
    @IsNumber()
    maxResults?: number;

    @ApiPropertyOptional({ description: 'Delay between retries in ms' })
    @IsOptional()
    @IsNumber()
    retryDelay?: number;

    @ApiPropertyOptional({ description: 'Number of retry attempts on error' })
    @IsOptional()
    @IsNumber()
    retryAttempts?: number;

    @ApiPropertyOptional({ description: 'User agent string for browser simulation' })
    @IsOptional()
    @IsString()
    userAgent?: string;

    @ApiPropertyOptional({ description: 'Headers to add to the request' })
    @IsOptional()
    @IsObject()
    headers?: Record<string, string>;

    @ApiPropertyOptional({ description: 'Cookies to add to the request' })
    @IsOptional()
    @IsObject()
    cookies?: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
    }>;

    @ApiPropertyOptional({ description: 'Enable stealth mode to bypass bot detection' })
    @IsOptional()
    @IsBoolean()
    stealthMode?: boolean;

    @ApiPropertyOptional({ description: 'Enable Cloudflare Bypass' })
    @IsOptional()
    @IsBoolean()
    cloudflareBypass?: boolean;

    @ApiPropertyOptional({ description: 'Selector to wait for before fetching content' })
    @IsOptional()
    @IsString()
    waitForSelector?: string;

    @ApiPropertyOptional({ description: 'Enable or disable JavaScript execution' })
    @IsOptional()
    @IsBoolean()
    javascriptEnabled?: boolean;

    @ApiPropertyOptional({ description: 'Enable or disable image loading' })
    @IsOptional()
    @IsBoolean()
    imagesEnabled?: boolean;

    @ApiPropertyOptional({ description: 'Enable or disable CSS loading' })
    @IsOptional()
    @IsBoolean()
    cssEnabled?: boolean;
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
