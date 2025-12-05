import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { DisplayType } from '../../enums';

export class CreateDataProviderItemRequestDto {
    @ApiProperty({ description: 'Item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsNotEmpty()
    @IsUUID()
    @AutoMap()
    itemId: string;

    @ApiProperty({ description: 'Data Provider ID', example: '123e4567-e89b-12d3-a456-426614174001' })
    @IsNotEmpty()
    @IsUUID()
    @AutoMap()
    dataProviderId: string;

    @ApiProperty({ description: 'URL to the item on the data provider website', example: 'https://example.com/item/123' })
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @AutoMap()
    itemUrl: string;

    @ApiProperty({ description: 'Display type of the data provider item', example: DisplayType.IMAGE })
    @IsNotEmpty()
    @IsEnum(DisplayType)
    @AutoMap()
    displayType: DisplayType;

    @ApiPropertyOptional({ description: 'Active status of the data provider item' })
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Auto process scraping of the data provider item' })
    @IsOptional()
    @IsBoolean()
    autoProcessScraping?: boolean;

    @ApiPropertyOptional({ description: 'Check duplicate data', default: true })
    @IsOptional()
    @IsBoolean()
    checkDuplicateData?: boolean;

    @ApiPropertyOptional({ description: 'Is saved to cloud data', default: false })
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isSavedToCloudData?: boolean;

    @ApiPropertyOptional({ description: 'Cloud data provider ID', example: '123e4567-e89b-12d3-a456-426614174002' })
    @IsOptional()
    @IsUUID()
    @AutoMap()
    cloudDataProviderId?: string;
}

export class UpdateDataProviderItemRequestDto {
    @ApiPropertyOptional({ description: 'Item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsOptional()
    @IsUUID()
    itemId?: string;

    @ApiPropertyOptional({ description: 'Data Provider ID', example: '123e4567-e89b-12d3-a456-426614174001' })
    @IsOptional()
    @IsUUID()
    dataProviderId?: string;

    @ApiPropertyOptional({ description: 'URL to the item on the data provider website', example: 'https://example.com/item/123' })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    itemUrl?: string;

    @ApiPropertyOptional({ description: 'Active status of the data provider item' })
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Display type of the data provider item', example: DisplayType.IMAGE })
    @IsOptional()
    @IsEnum(DisplayType)
    @AutoMap()
    displayType?: DisplayType;

    @ApiPropertyOptional({ description: 'Is saved to cloud data', default: false })
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isSavedToCloudData?: boolean;

    @ApiPropertyOptional({ description: 'Cloud data provider ID', example: '123e4567-e89b-12d3-a456-426614174002' })
    @IsOptional()
    @IsUUID()
    @AutoMap()
    cloudDataProviderId?: string;
}

export class CreateManuallyTriggerScrapingRequestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsArray()
    @IsUUID('all', { each: true })
    ids: string[];

    @ApiPropertyOptional({ description: 'Priority level (must be a positive integer greater than 0)', default: 10 })
    @IsOptional()
    @IsInt({ message: 'Priority must be a positive integer greater than 0' })
    @Min(0, { message: 'Priority must be a positive integer greater than 0' })
    priority?: number;
}

export class TriggerManuallyScrapingBulkRequestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    productId: string;

    @ApiPropertyOptional({ description: 'Priority level (must be a positive integer greater than 0)', default: 10 })
    @IsOptional()
    @IsInt({ message: 'Priority must be a positive integer greater than 0' })
    @Min(0, { message: 'Priority must be a positive integer greater than 0' })
    priority?: number;
}
