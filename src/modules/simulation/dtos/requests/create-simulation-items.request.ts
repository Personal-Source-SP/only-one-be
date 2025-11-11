import { ApiProperty } from '@nestjs/swagger';

export class CreateSimulationItemsRequest {
    @ApiProperty({ type: [Object] })
    payloads: Record<string, any>[];
}
