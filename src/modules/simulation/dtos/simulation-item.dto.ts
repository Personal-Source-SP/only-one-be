import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { SimulationItemStatus } from '../enums';

export class SimulationItemDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    simulationContextId: string;

    @ApiResponseProperty()
    @AutoMap()
    status: SimulationItemStatus;

    @ApiResponseProperty()
    @AutoMap()
    expiresAt?: Date;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    payload?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    errorMessage?: string;
}
