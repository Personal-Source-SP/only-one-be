import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, Post, UUIDParam } from '../../../decorators';
import { SIMULATION_ITEM_PAGINATION_CONFIG } from '../constants/simulation-item.config';
import { CreateSimulationItemRequest } from '../dtos/requests';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationItemEntity } from '../entities/simulation-item.entity';
import { SimulationItemService } from '../services/simulation-item.service';

@ApiTags('Simulation Items')
@Controller('simulation-items')
@Auth()
export class SimulationItemController extends BaseController<SimulationItemEntity, SimulationItemDto> {
    constructor(private readonly simulationItemService: SimulationItemService) {
        super(simulationItemService, SIMULATION_ITEM_PAGINATION_CONFIG);
    }

    @Post({
        summary: 'Create simulation item',
        responseDto: SimulationItemDto,
    })
    async create(@Body() dto: CreateSimulationItemRequest): Promise<SimulationItemDto> {
        const result = await this.simulationItemService.create(dto);
        return result;
    }

    @Post({
        path: ':id/run',
        summary: 'Run simulation item',
        responseDto: Boolean,
    })
    async run(@UUIDParam('id') id: string): Promise<boolean> {
        const result = await this.simulationItemService.run(id);
        return result;
    }
}
