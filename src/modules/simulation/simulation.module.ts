import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimulationContextController } from './controllers/simulation-context.controller';
import { SimulationController } from './controllers/simulation.controller';
import { SimulationContextEntity } from './entities/simulation-context.entity';
import { SimulationItemEntity } from './entities/simulation-item.entity';
import { SimulationService } from './services/simulation.service';
import { SimulationProfile } from './simulation.profile';

const services = [SimulationService];
const entities = [SimulationContextEntity, SimulationItemEntity];
const controllers = [SimulationController, SimulationContextController];

@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    controllers: [...controllers],
    providers: [...services, SimulationProfile],
    exports: [...services, SimulationProfile],
})
export class SimulationModule {}
