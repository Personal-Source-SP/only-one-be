import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CreateSimulationItemsRequest } from '../dtos/requests';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationItemService } from '../services/simulation-item.service';
import { BaseController } from '../../../common/base.controller';
import { SimulationItemEntity } from '../entities/simulation-item.entity';
import { SIMULATION_ITEM_PAGINATION_CONFIG } from '../constants/simulation-item.config';

@ApiTags('Simulation Items')
@Controller('simulation-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SimulationItemController extends BaseController<SimulationItemEntity, SimulationItemDto> {
    constructor(private readonly simulationItemService: SimulationItemService) {
        super(simulationItemService, SIMULATION_ITEM_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Create many simulation items from payloads by simulation context id' })
    @Post(':simulationContextId/items')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(SimulationItemDto)
    public async createItems(
        @Param('simulationContextId', new ParseUUIDPipe()) id: string,
        @Body() dto: CreateSimulationItemsRequest,
    ): Promise<SimulationItemDto[]> {
        const result = await this.simulationItemService.createManyFromPayloads(id, dto);
        return result;
    }

    @ApiOperation({ summary: 'Start simulation item' })
    @Post(':id/start')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(Boolean)
    public async start(@Param('id') id: string): Promise<boolean> {
        const result = await this.simulationItemService.start(id);
        return result;
    }

    @ApiOperation({ summary: 'Pause simulation item' })
    @Post(':id/pause')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(Boolean)
    public async pause(@Param('id') id: string): Promise<boolean> {
        const result = await this.simulationItemService.pause(id);
        return result;
    }

    @ApiOperation({ summary: 'Stop simulation item' })
    @Post(':id/stop')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(Boolean)
    public async stop(@Param('id') id: string): Promise<boolean> {
        const result = await this.simulationItemService.stop(id);
        return result;
    }
}
