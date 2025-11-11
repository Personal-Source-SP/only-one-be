import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationItemEntity } from '../entities/simulation-item.entity';

@Injectable()
export class SimulationItemService extends BaseService<SimulationItemEntity, SimulationItemDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(SimulationItemEntity) simulationItemRepository: Repository<SimulationItemEntity>,
    ) {
        super(simulationItemRepository, mapper, SimulationItemDto);
    }
}
