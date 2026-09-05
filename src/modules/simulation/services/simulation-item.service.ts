import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { AppException } from '../../../exceptions/app.exception';
import { SimulationError } from '../constants/simulation-error';
import { CreateSimulationItemRequest } from '../dtos/requests';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationItemEntity } from '../entities/simulation-item.entity';
import { SimulationItemStatus } from '../enums';
import { SimulationExecutionService } from './simulation-execution.service';

@Injectable()
export class SimulationItemService extends BaseService<SimulationItemEntity, SimulationItemDto> {
    constructor(
        private readonly simulationExecutionService: SimulationExecutionService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(SimulationItemEntity) simulationItemRepository: Repository<SimulationItemEntity>,
    ) {
        super(simulationItemRepository, mapper, SimulationItemDto, SimulationItemService.name);
    }

    async create(request: CreateSimulationItemRequest): Promise<SimulationItemDto> {
        const simulationItemEntity = this.mapper.map(request, CreateSimulationItemRequest, SimulationItemEntity);
        return await super.create(simulationItemEntity);
    }

    async run(id: string): Promise<boolean> {
        const simulationItemExists = await this.findOneByFilter({ id }, { relations: { simulationContext: true } });
        if (!simulationItemExists) {
            this.loggerService.error(`[SimulationItemService] Simulation item not found with id ${id}`);
            throw new AppException(SimulationError.ItemNotFound);
        }

        await super.update(id, { status: SimulationItemStatus.PROCESSING });

        try {
            const result = await this.simulationExecutionService.execute({
                payload: simulationItemExists.payload,
                serviceExecution: simulationItemExists.simulationContext?.serviceExecution,
            });

            await super.update(id, { status: SimulationItemStatus.PENDING, metadata: result.data });

            return result.isSuccess;
        } catch (error) {
            await super.update(id, { status: SimulationItemStatus.PENDING, errorMessage: error?.message });
            return false;
        }
    }
}
