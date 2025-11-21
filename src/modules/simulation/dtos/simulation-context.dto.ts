import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { SimulationContextStatus, SimulationService } from '../enums';
import { SimulationItemDto } from './simulation-item.dto';

export class SimulationContextDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    baseUrl: string;

    @ApiResponseProperty()
    @AutoMap()
    status: SimulationContextStatus;

    @ApiResponseProperty()
    @AutoMap()
    serviceExecution: SimulationService;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    defaultPayload?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    steps?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    lastSuccessfulRunAt?: Date;

    @ApiResponseProperty()
    @AutoMap(() => [SimulationItemDto])
    simulationItems?: SimulationItemDto[];
}
