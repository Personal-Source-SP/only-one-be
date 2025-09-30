import { Module } from '@nestjs/common';
import { SimulationService } from './services/simulation.service';

@Module({
    providers: [SimulationService],
    exports: [SimulationService],
})
export class SimulationModule {}
