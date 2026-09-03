import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, Min } from 'class-validator';

export class CreateDiscoverySessionRequestDto {
    @ApiProperty({ description: 'Data Provider ID' })
    @IsUUID()
    @IsNotEmpty()
    @AutoMap()
    dataProviderId: string;

    @ApiProperty({ description: 'Target URL to begin link discovery' })
    @IsUrl()
    @IsNotEmpty()
    @AutoMap()
    targetUrl: string;

    @ApiPropertyOptional({ description: 'Crawl depth (1-5)', default: 1 })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsOptional()
    @AutoMap()
    depth?: number;

    @ApiPropertyOptional({ description: 'Maximum URLs to discover (omit for unbounded discovery)', default: null })
    @IsNumber()
    @Min(1)
    @Max(10000)
    @IsOptional()
    @AutoMap()
    maxUrls?: number;

    @ApiPropertyOptional({ description: 'Automatically run validation batch upon completion', default: true })
    @IsBoolean()
    @IsOptional()
    @AutoMap()
    autoValidate?: boolean;

    @ApiPropertyOptional({ description: 'Target keyword for fuzzy matching' })
    @IsString()
    @IsOptional()
    @AutoMap()
    targetKeyword?: string;

    @ApiPropertyOptional({ description: 'Notes for the session' })
    @IsString()
    @IsOptional()
    @AutoMap()
    notes?: string;
}
