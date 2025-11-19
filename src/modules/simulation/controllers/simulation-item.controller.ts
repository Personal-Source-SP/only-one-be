import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { SIMULATION_ITEM_PAGINATION_CONFIG } from '../constants/simulation-item.config';
import { CreateSimulationItemsRequest } from '../dtos/requests';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationItemEntity } from '../entities/simulation-item.entity';
import { SimulationItemService } from '../services/simulation-item.service';

@ApiTags('Simulation Items')
@Controller('simulation-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SimulationItemController extends BaseController<SimulationItemEntity, SimulationItemDto> {
    constructor(private readonly simulationItemService: SimulationItemService) {
        super(simulationItemService, SIMULATION_ITEM_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Create many simulation items from payloads by simulation context id' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post(':simulationContextId/items')
    @BaseApiOkResponse(SimulationItemDto)
    public async createItems(
        @Param('simulationContextId', new ParseUUIDPipe()) id: string,
        @Body() dto: CreateSimulationItemsRequest,
    ): Promise<SimulationItemDto[]> {
        const result = await this.simulationItemService.createManyFromPayloads(id, dto);
        return result;
    }

    @ApiOperation({ summary: 'Start simulation item' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post(':id/start')
    @BaseApiOkResponse(Boolean)
    public async start(@Param('id') id: string): Promise<boolean> {
        const result = await this.simulationItemService.start(id);
        return result;
    }

    @ApiOperation({ summary: 'Pause simulation item' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post(':id/pause')
    @BaseApiOkResponse(Boolean)
    public async pause(@Param('id') id: string): Promise<boolean> {
        const result = await this.simulationItemService.pause(id);
        return result;
    }

    @ApiOperation({ summary: 'Stop simulation item' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post(':id/stop')
    @BaseApiOkResponse(Boolean)
    public async stop(@Param('id') id: string): Promise<boolean> {
        const result = await this.simulationItemService.stop(id);
        return result;
    }
}
