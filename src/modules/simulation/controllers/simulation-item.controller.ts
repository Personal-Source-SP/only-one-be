import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { SimulationItemService } from '../services/simulation-item.service';

@ApiTags('Simulation Items')
@ApiBearerAuth()
@Controller('simulation-items')
export class SimulationItemController {
    constructor(private readonly simulationItemService: SimulationItemService) {}

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
