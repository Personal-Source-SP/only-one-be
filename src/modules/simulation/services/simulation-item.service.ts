import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { Browser } from 'puppeteer';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { PuppeteerService } from '../../../shared/services/puppeteer.service';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationItemEntity } from '../entities/simulation-item.entity';
import { SimulationItemStatus } from '../enums';
import { CreateSimulationItemsRequest } from '../dtos/requests';

@Injectable()
export class SimulationItemService extends BaseService<SimulationItemEntity, SimulationItemDto> implements OnModuleInit {
    constructor(
        private readonly puppeteerService: PuppeteerService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(SimulationItemEntity) simulationItemRepository: Repository<SimulationItemEntity>,
    ) {
        super(simulationItemRepository, mapper, SimulationItemDto, SimulationItemService.name);
    }

    async onModuleInit() {
        await this.loadSimulationItems();
    }

    @Cron(CronExpression.EVERY_HOUR)
    async checkForSimulationItemChanges() {
        await this.loadSimulationItems();
    }

    async createManyFromPayloads(simulationContextId: string, request: CreateSimulationItemsRequest): Promise<SimulationItemEntity[]> {
        const items = request.payloads.map((payload) =>
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

    async delete(id: string): Promise<boolean> {
        try {
            await this.puppeteerService.closePageSession(id);
        } catch {
            this.loggerService.error(`[SimulationItemService] Failed to close page session for id ${id}`);
            throw new NotFoundException('Failed to close page session');
        }

        return await super.delete(id);
    }

    private async loadSimulationItems(): Promise<void> {
        const simulationItems = await this.findAll();
        if (!simulationItems?.length) {
            this.loggerService.log('[SimulationItemService] No simulation items found or all simulation items are not pending.');
            return;
        }

        const browserSessions = this.puppeteerService.getBrowserSessions();

        const initBrowserPromises: Promise<Browser>[] = [];
        simulationItems.forEach((simulationItem) => {
            const existing = browserSessions.get(simulationItem.id);

            if (
                !existing &&
                simulationItem.status === SimulationItemStatus.PROCESSING &&
                (simulationItem.expiresAt === null || dayjs(simulationItem.expiresAt).isBefore(dayjs()))
            ) {
                initBrowserPromises.push(this.puppeteerService.getBrowserSession(simulationItem.id));
            }
        });

        try {
            await Promise.all(initBrowserPromises);
        } catch (error) {
            this.loggerService.error(`[SimulationItemService] Failed to initialize browsers: ${error?.message}`);
            throw new NotFoundException('Failed to initialize browsers');
        }

        const removeBrowserPromises: Promise<boolean>[] = [];
        simulationItems.forEach((simulationItem) => {
            const existing = browserSessions.get(simulationItem.id);
            if (existing) {
                removeBrowserPromises.push(this.puppeteerService.closePageSession(simulationItem.id));
            }
        });

        try {
            await Promise.all(removeBrowserPromises);
        } catch (error) {
            this.loggerService.error(`[SimulationItemService] Failed to remove browsers: ${error?.message}`);
            throw new NotFoundException('Failed to initialize browsers');
        }
    }
}
