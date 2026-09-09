import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, Post } from '../../../decorators';
import { SIMULATION_CONTEXT_PAGINATION_CONFIG } from '../constants/simulation-context.config';
import { CreateSimulationContextRequest } from '../dtos/requests';
import { SimulationContextDto } from '../dtos/simulation-context.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';
import { SimulationContextService } from '../services/simulation-context.service';

@ApiTags('Simulation Contexts')
@Controller('simulation-contexts')
@Auth()
export class SimulationContextController extends BaseController<SimulationContextEntity, SimulationContextDto> {
    constructor(private readonly simulationContextService: SimulationContextService) {
        super(simulationContextService, SIMULATION_CONTEXT_PAGINATION_CONFIG);
    }

    @Post({
        summary: 'Create simulation context',
        responseDto: SimulationContextDto,
    })
    async create(@Body() dto: CreateSimulationContextRequest): Promise<SimulationContextDto> {
        const result = await this.simulationContextService.create(dto);
        return result;
    }
}
