import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { SimulationContextStatus } from '../enums';
import { SimulationItemDto } from './simulation-item.dto';

export class SimulationContextDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    identifier: string;

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
    @AutoMap(() => Object)
    payload?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    lastSuccessfulScrapeAt?: Date;

    @ApiResponseProperty()
    @AutoMap(() => [SimulationItemDto])
    simulationItems?: SimulationItemDto[];
}
