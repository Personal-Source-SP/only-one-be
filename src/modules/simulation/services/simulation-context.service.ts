import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { SimulationContextDto } from '../dtos/simulation-context.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';
import { SimulationItemEntity } from '../entities/simulation-item.entity';
import { SimulationItemService } from './simulation-item.service';

@Injectable()
export class SimulationContextService extends BaseService<SimulationContextEntity, SimulationContextDto> {
    constructor(
        private readonly simulationItemService: SimulationItemService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(SimulationContextEntity) simulationContextRepository: Repository<SimulationContextEntity>,
    ) {
        super(simulationContextRepository, mapper, SimulationContextDto, SimulationContextService.name);
    }

    public async createItemsFromPayloads(simulationContextId: string, payloads: Record<string, any>[]): Promise<SimulationItemEntity[]> {
        return await this.simulationItemService.createManyFromPayloads(simulationContextId, payloads);
    }
}
