import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject } from 'class-validator';

export class CreateSimulationItemsRequest {
    @ApiProperty({ type: [Object] })
    @IsArray()
    @IsObject({ each: true })
    payloads: Record<string, any>[];
}
