import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import { SimulationService } from '../../enums';

export class CreateSimulationContextRequest {
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

    @ApiProperty({ description: 'Service execution', enum: SimulationService, default: SimulationService.UNLUCID_AI })
    @IsEnum(SimulationService)
    @AutoMap()
    serviceExecution: SimulationService;

    @ApiPropertyOptional({ type: Object })
    @IsOptional()
    @IsObject()
    @AutoMap(() => Object)
    defaultPayload?: Record<string, any>;

    @ApiPropertyOptional({ type: Object })
    @IsOptional()
    @IsObject()
    @AutoMap(() => Object)
    steps?: Record<string, any>;
}
