import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSimulationContextRequest {
    @ApiProperty({ maxLength: 255 })
    @IsString()
    @MaxLength(255)
    @AutoMap()
    identifier: string;

    @ApiProperty({ maxLength: 255 })
    @IsString()
    @MaxLength(255)
    @AutoMap()
    name: string;

    @ApiProperty({ maxLength: 255 })
    @IsString()
    @MaxLength(255)
    @AutoMap()
    baseUrl: string;

    @ApiPropertyOptional({ type: Object })
    @IsOptional()
    @IsObject()
    @AutoMap(() => Object)
    payload?: Record<string, any>;
}
