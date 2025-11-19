import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSimulationItemRequest {
    @ApiProperty({ description: 'Simulation context ID' })
    @IsString()
    @AutoMap()
    simulationContextId: string;

    @ApiPropertyOptional({ description: 'Payload' })
    @IsOptional()
    @IsObject()
    @AutoMap(() => Object)
    payload?: Record<string, any>;
}
