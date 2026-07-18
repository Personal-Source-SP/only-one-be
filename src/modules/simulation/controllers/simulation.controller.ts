import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { SimulateResponse } from '../dtos/responses/simulate.response';
import { SimulationService } from '../enums';
import { SimulationExecutionSummary } from '../interfaces';
import { SimulationExecutionService } from '../services/simulation-execution.service';
import { SimulateUnlucidAiRequest } from './../dtos/requests/simulate-unlucid-ai.request';

@Controller('simulations')
@ApiTags('Simulations')
export class SimulationController {
    constructor(private readonly simulationExecutionService: SimulationExecutionService) {}

    @ApiOperation({ summary: 'Simulate Unlucid AI' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post('simulate-unlucid-ai')
    @BaseApiOkResponse(SimulateResponse<SimulationExecutionSummary>)
    public async simulateUnlucidAI(@Body() dto: SimulateUnlucidAiRequest): Promise<SimulateResponse<SimulationExecutionSummary>> {
        const result = await this.simulationExecutionService.execute({ serviceExecution: SimulationService.UNLUCID_AI, payload: dto });
        return result;
    }
}
