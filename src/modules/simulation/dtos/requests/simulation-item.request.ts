import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { SimulationService } from '../../enums';

export class CreateSimulationItemRequest {
    @ApiProperty({ description: 'Simulation context ID' })
    @IsString()
    @AutoMap()
    simulationContextId: string;

    @ApiProperty({ description: 'Service execution', enum: SimulationService, default: SimulationService.UNLUCID_AI })
    @IsEnum(SimulationService)
    @AutoMap()
    serviceExecution: SimulationService;

    @ApiPropertyOptional({ description: 'Payload' })
    @IsOptional()
    @IsObject()
    @AutoMap(() => Object)
    payload?: Record<string, any>;
}
