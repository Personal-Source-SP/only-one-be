import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Post } from '../../../decorators';
import { SimulateResponse } from '../dtos/responses/simulate.response';
import { SimulationService } from '../enums';
import { SimulationExecutionSummary } from '../interfaces';
import { SimulationExecutionService } from '../services/simulation-execution.service';
import { SimulateUnlucidAiRequest } from './../dtos/requests/simulate-unlucid-ai.request';

@Controller('simulations')
@ApiTags('Simulations')
export class SimulationController {
    constructor(private readonly simulationExecutionService: SimulationExecutionService) {}

    @Post({
        path: 'simulate-unlucid-ai',
        summary: 'Simulate Unlucid AI',
        responseDto: SimulateResponse<SimulationExecutionSummary>,
    })
    async simulateUnlucidAI(@Body() dto: SimulateUnlucidAiRequest): Promise<SimulateResponse<SimulationExecutionSummary>> {
        const result = await this.simulationExecutionService.execute({ serviceExecution: SimulationService.UNLUCID_AI, payload: dto });
        return result;
    }
}
