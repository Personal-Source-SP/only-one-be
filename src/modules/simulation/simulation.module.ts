import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimulationContextController } from './controllers/simulation-context.controller';
import { SimulationItemController } from './controllers/simulation-item.controller';
import { SimulationController } from './controllers/simulation.controller';
import { SimulationContextEntity } from './entities/simulation-context.entity';
import { SimulationItemEntity } from './entities/simulation-item.entity';
import { SimulationContextService } from './services/simulation-context.service';
import { SimulationItemService } from './services/simulation-item.service';
import { SimulationExecutionService } from './services/simulation-execution.service';
import { SimulationProfile } from './simulation.profile';

const entities = [SimulationContextEntity, SimulationItemEntity];
const services = [SimulationExecutionService, SimulationContextService, SimulationItemService];
const controllers = [SimulationController, SimulationContextController, SimulationItemController];

@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    controllers: [...controllers],
    providers: [...services, SimulationProfile],
    exports: [...services, SimulationProfile],
})
export class SimulationModule {}
