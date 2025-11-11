import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { SimulationContextDto } from '../dtos/simulation-context.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';

@Injectable()
export class SimulationContextService extends BaseService<SimulationContextEntity, SimulationContextDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(SimulationContextEntity) simulationContextRepository: Repository<SimulationContextEntity>,
    ) {
        super(simulationContextRepository, mapper, SimulationContextDto);
    }
}
