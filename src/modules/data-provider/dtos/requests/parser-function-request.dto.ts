import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class TargetConfigRequest {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    functionGenerator?: string;

    @ApiProperty()
    @IsString()
    mainContentSelector: string;

    @ApiProperty({ default: false })
    @IsBoolean()
    isGetParentElement: boolean;
}

export class TestParserFunctionRequestDto {
    @ApiProperty({ description: 'Scraper service name' })
    @IsString()
    scraperService: string;

    @ApiProperty({ type: TargetConfigRequest, description: 'Target config' })
    @IsObject()
    targetConfig: TargetConfigRequest;

    @ApiPropertyOptional({ description: 'URL' })
    @IsOptional()
    @ValidateIf((o) => !o.htmlContentString)
    @IsUrl()
    url?: string;

    @ApiPropertyOptional({ description: 'HTML content' })
    @IsOptional()
    @ValidateIf((o) => !o.url)
    @IsString()
    htmlContentString?: any;
}
