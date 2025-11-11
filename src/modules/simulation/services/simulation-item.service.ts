import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { PuppeteerService } from '../../../shared/services/puppeteer.service';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationItemEntity } from '../entities/simulation-item.entity';
import { SimulationItemStatus } from '../enums';

@Injectable()
export class SimulationItemService extends BaseService<SimulationItemEntity, SimulationItemDto> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly puppeteerService: PuppeteerService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(SimulationItemEntity) simulationItemRepository: Repository<SimulationItemEntity>,
    ) {
        super(simulationItemRepository, mapper, SimulationItemDto);
    }

    async createManyFromPayloads(simulationContextId: string, payloads: Record<string, any>[]): Promise<SimulationItemEntity[]> {
        const items = payloads.map((payload) =>
            this.repository.create({
                simulationContextId,
                status: SimulationItemStatus.PENDING,
                payload,
            }),
        );
        return await this.repository.save(items);
    }

    async start(id: string): Promise<boolean> {
        const simulationItemExists = await this.findById(id);
        if (!simulationItemExists) {
            this.loggerService.error(`[SimulationItemService] Simulation item not found with id ${id}`);
            throw new NotFoundException('Simulation item not found');
        }

        const { wsEndpoint } = await this.puppeteerService.ensureSessionAndPage(id);

        return await super.update(id, {
            status: SimulationItemStatus.PROCESSING,
            metadata: { ...(simulationItemExists.payload ?? {}), wsEndpoint },
        });
    }

    async pause(id: string): Promise<boolean> {
        const simulationItemExists = await this.exists({ id });
        if (!simulationItemExists) {
            this.loggerService.error(`[SimulationItemService] Simulation item not found with id ${id}`);
            throw new NotFoundException('Simulation item not found');
        }

        return await super.update(id, { status: SimulationItemStatus.PAUSED });
    }

    async stop(id: string): Promise<boolean> {
        const simulationItemExists = await this.exists({ id });
        if (!simulationItemExists) {
            this.loggerService.error(`[SimulationItemService] Simulation item not found with id ${id}`);
            throw new NotFoundException('Simulation item not found');
        }

        try {
            await this.puppeteerService.closePageSession(id);
        } catch {
            this.loggerService.error(`[SimulationItemService] Failed to close page session for id ${id}`);
            throw new NotFoundException('Failed to close page session');
        }

        return await super.update(id, { status: SimulationItemStatus.STOPPED });
    }

    async deleteWithSession(id: string): Promise<boolean> {
        try {
            await this.puppeteerService.closePageSession(id);
        } catch {
            this.loggerService.error(`[SimulationItemService] Failed to close page session for id ${id}`);
            throw new NotFoundException('Failed to close page session');
        }

        return await super.delete(id);
    }
}
