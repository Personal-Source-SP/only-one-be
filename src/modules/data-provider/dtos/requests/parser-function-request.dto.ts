import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { UpdateTargetConfigRequestDto } from './data-provider-request.dto';

export class TestParserFunctionRequestDto extends UpdateTargetConfigRequestDto {
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

    @ApiPropertyOptional({ description: 'Data content' })
    @IsOptional()
    @IsObject()
    dataContent?: Record<string, any>;
}
