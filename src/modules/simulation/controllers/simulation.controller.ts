import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SimulateUnlucidAiRequest } from './../dtos/requests/simulate-unlucid-ai.request';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { SimulateResponse } from '../dtos/responses/simulate.response';
import { SimulationExecutionService } from '../services/simulation-execution.service';

@Controller('simulations')
@ApiTags('simulations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SimulationController {
    constructor(private readonly simulationExecutionService: SimulationExecutionService) {}

    @ApiOperation({ summary: 'Simulate Unlucid AI' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('simulate-unlucid-ai')
    @BaseApiOkResponse(SimulateResponse<boolean>)
    public async simulateUnlucidAI(@Body() dto: SimulateUnlucidAiRequest): Promise<SimulateResponse<boolean>> {
        const result = await this.simulationExecutionService.simulateUnlucidAI(dto);
        return result;
    }
}
