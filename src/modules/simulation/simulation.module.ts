import { Module } from '@nestjs/common';
import { SimulationController } from './controllers/simulation.controller';
import { SimulationService } from './services/simulation.service';

@Module({
    controllers: [SimulationController],
    providers: [SimulationService],
    exports: [SimulationService],
})
export class SimulationModule {}
