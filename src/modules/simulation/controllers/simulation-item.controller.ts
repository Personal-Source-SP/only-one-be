import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SimulationItemService } from '../services/simulation-item.service';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';

@ApiTags('Simulation Items')
@ApiBearerAuth()
@Controller('simulation-items')
export class SimulationItemController {
    constructor(private readonly simulationItemService: SimulationItemService) {}

    @ApiOperation({ summary: 'Start simulation item' })
    @Post(':id/start')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(SimulationItemDto)
    public async start(@Param('id') id: string): Promise<SimulationItemDto> {
        const result = await this.simulationItemService.start(id);
        return this.simulationItemService.mapToDto(result);
    }

    @ApiOperation({ summary: 'Pause simulation item' })
    @Post(':id/pause')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(SimulationItemDto)
    public async pause(@Param('id') id: string): Promise<SimulationItemDto> {
        const result = await this.simulationItemService.pause(id);
        return this.simulationItemService.mapToDto(result);
    }

    @ApiOperation({ summary: 'Stop simulation item' })
    @Post(':id/stop')
    @HttpCode(HttpStatus.OK)
    @BaseApiOkResponse(SimulationItemDto)
    public async stop(@Param('id') id: string): Promise<SimulationItemDto> {
        const result = await this.simulationItemService.stop(id);
        return this.simulationItemService.mapToDto(result);
    }

    @ApiOperation({ summary: 'Delete simulation item' })
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    public async remove(@Param('id') id: string): Promise<void> {
        await this.simulationItemService.deleteWithSession(id);
    }

    @ApiOperation({ summary: 'Get access info (ws endpoint) for simulation item' })
    @Get(':id/access')
    @HttpCode(HttpStatus.OK)
    public async getAccess(@Param('id') id: string): Promise<{ wsEndpoint?: string }> {
        const item = await this.simulationItemService.findById(id);
        const wsEndpoint = (item?.metadata as any)?.wsEndpoint;
        return { wsEndpoint };
    }
}
