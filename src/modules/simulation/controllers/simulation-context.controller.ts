import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { SIMULATION_CONTEXT_PAGINATION_CONFIG } from '../constants/schedule-context.config';
import { SimulationContextDto } from '../dtos/simulation-context.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';
import { SimulationContextService } from '../services/simulation-context.service';
import { CreateSimulationItemsRequest } from '../dtos/requests/create-simulation-items.request';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { SimulationItemService } from '../services/simulation-item.service';

@ApiTags('Simulation Contexts')
@Controller('simulation-contexts')
export class SimulationContextController extends BaseController<SimulationContextEntity, SimulationContextDto> {
    constructor(
        private readonly simulationContextService: SimulationContextService,
        private readonly simulationItemService: SimulationItemService,
    ) {
        super(simulationContextService, SIMULATION_CONTEXT_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Create simulation items from payloads' })
    @Post(':id/items')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse([SimulationItemDto])
    public async createItems(@Param('id') id: string, @Body() dto: CreateSimulationItemsRequest): Promise<SimulationItemDto[]> {
        const created = await this.simulationContextService.createItemsFromPayloads(id, dto.payloads ?? []);
        return created.map((i) => this.simulationItemService.mapToDto(i));
    }
}
