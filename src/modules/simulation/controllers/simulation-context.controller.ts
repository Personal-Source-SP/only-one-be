import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth } from '../../../decorators';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
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

    @ApiOperation({ summary: 'Create simulation context' })
    @Version('1')
    @Post()
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(SimulationContextDto)
    public async create(@Body() dto: CreateSimulationContextRequest): Promise<SimulationContextDto> {
        const result = await this.simulationContextService.create(dto);
        return result;
    }
}
