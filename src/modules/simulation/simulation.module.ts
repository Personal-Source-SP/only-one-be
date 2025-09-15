import { Module } from '@nestjs/common';
import { SimulationControllerV2 } from './controllers/simulation.controller';
import { SimulationService } from './services/simulation.service';

@Module({
    imports: [],
    providers: [SimulationService],
    controllers: [SimulationControllerV2],
})
export class SimulationModule {}
