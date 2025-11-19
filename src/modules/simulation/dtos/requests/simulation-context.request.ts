import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

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
    @AutoMap()
    payload?: Record<string, any>;
}

export class CreateSimulationItemsRequest {
    @ApiProperty({ type: [Object] })
    @IsArray()
    @IsObject({ each: true })
    payloads: Record<string, any>[];
}
