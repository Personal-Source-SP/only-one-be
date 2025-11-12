import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { SIMULATION_CONTEXT_PAGINATION_CONFIG } from '../constants/schedule-context.config';
import { CreateSimulationItemsRequest } from '../dtos/requests/create-simulation-items.request';
import { SimulationContextDto } from '../dtos/simulation-context.dto';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';
import { SimulationContextService } from '../services/simulation-context.service';

@ApiTags('Simulation Contexts')
@Controller('simulation-contexts')
export class SimulationContextController extends BaseController<SimulationContextEntity, SimulationContextDto> {
    constructor(private readonly simulationContextService: SimulationContextService) {
        super(simulationContextService, SIMULATION_CONTEXT_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Create simulation items from payloads' })
    @Post(':id/items')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(SimulationItemDto)
    public async createItems(@Param('id') id: string, @Body() dto: CreateSimulationItemsRequest): Promise<SimulationItemDto[]> {
        const result = await this.simulationContextService.createItemsFromPayloads(id, dto.payloads ?? []);
        return result;
    }
}
