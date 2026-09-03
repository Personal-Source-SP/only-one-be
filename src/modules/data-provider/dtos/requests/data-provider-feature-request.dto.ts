import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

import { DataProviderFeatureType, ScraperServiceEnum } from '../../enums';

export class CreateDataProviderFeatureRequestDto {
    @ApiProperty({ enum: DataProviderFeatureType, description: 'Type of feature' })
    @IsEnum(DataProviderFeatureType)
    @IsNotEmpty()
    type: DataProviderFeatureType;

    @ApiPropertyOptional({ enum: ScraperServiceEnum, default: ScraperServiceEnum.GENERIC, description: 'Service runtime identifier' })
    @IsEnum(ScraperServiceEnum)
    @IsOptional()
    service?: ScraperServiceEnum;

    @ApiPropertyOptional({ type: Object, description: 'Feature configuration payload' })
    @IsObject()
    @IsOptional()
    config?: Record<string, any>;
}

export class UpdateFeatureConfigRequestDto {
    @ApiProperty({ type: Object, description: 'Feature configuration payload' })
    @IsObject()
    @IsNotEmpty()
    config: Record<string, any>;

    @ApiPropertyOptional({ enum: ScraperServiceEnum, description: 'Service runtime identifier' })
    @IsEnum(ScraperServiceEnum)
    @IsOptional()
    service?: ScraperServiceEnum;

    @ApiPropertyOptional({ description: 'Description of changes for version history' })
    @IsString()
    @IsOptional()
    changeDescription?: string;
}

export class TestFeatureStatelessRequestDto {
    @ApiProperty({ enum: DataProviderFeatureType, description: 'Feature type to test' })
    @IsEnum(DataProviderFeatureType)
    @IsNotEmpty()
    type: DataProviderFeatureType;

    @ApiPropertyOptional({ enum: ScraperServiceEnum, default: ScraperServiceEnum.GENERIC, description: 'Service engine to test' })
    @IsEnum(ScraperServiceEnum)
    @IsOptional()
    service?: ScraperServiceEnum;

    @ApiProperty({ type: Object, description: 'Raw draft configuration payload' })
    @IsObject()
    @IsNotEmpty()
    config: Record<string, any>;

    @ApiPropertyOptional({ type: Object, description: 'Test input payload (e.g. url, htmlContentString, query)' })
    @IsObject()
    @IsOptional()
    input?: Record<string, any>;
}

export class TestFeatureContextualRequestDto {
    @ApiPropertyOptional({ type: Object, description: 'Optional input payload override' })
    @IsObject()
    @IsOptional()
    input?: Record<string, any>;
}
