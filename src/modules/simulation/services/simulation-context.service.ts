import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { CreateSimulationContextRequest } from '../dtos/requests';
import { SimulationContextDto } from '../dtos/simulation-context.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';

@Injectable()
export class SimulationContextService extends BaseService<SimulationContextEntity, SimulationContextDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(SimulationContextEntity) simulationContextRepository: Repository<SimulationContextEntity>,
    ) {
        super(simulationContextRepository, mapper, SimulationContextDto, SimulationContextService.name);
    }

    async create(request: CreateSimulationContextRequest): Promise<SimulationContextDto> {
        const simulationContextEntity = this.mapper.map(request, CreateSimulationContextRequest, SimulationContextEntity);
        return await super.create(simulationContextEntity);
    }
}
