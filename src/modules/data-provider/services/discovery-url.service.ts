import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { DISCOVERY_URL_PAGINATION_CONFIG } from '../constants/discovery-url-pagination.config';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { ItemDto } from '../dtos/item.dto';
import { IngestDiscoveryUrlResponseDto } from '../dtos/responses';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
import { DiscoveryUrlStatus, FinalValidationStatus } from '../enums';
import { DataProviderItemService } from './data-provider-item.service';
import { ItemService } from './item.service';

@Injectable()
export class DiscoveryUrlService extends BaseService<DiscoveryUrlEntity, DiscoveryUrlDto> {
    constructor(
        private readonly itemService: ItemService,
        private readonly dataProviderItemService: DataProviderItemService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly urlRepository: Repository<DiscoveryUrlEntity>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepository: Repository<DiscoverySessionEntity>,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly logRepository: Repository<DiscoveryValidationLogEntity>,
    ) {
        super(urlRepository, mapper, DiscoveryUrlDto, DiscoveryUrlService.name);
    }

    async ingestDiscoveredUrl(urlId: string): Promise<{ itemId: string; dataProviderItemId: string; isNewItem: boolean }> {
        const urlEntity = await this.urlRepository.findOne({ where: { id: urlId } });
        if (!urlEntity) throw new NotFoundException(`Discovery URL not found with id: ${urlId}`);

        const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
        const name = urlEntity.title?.trim() || urlEntity.url;

        let item: ItemDto = null;
        let isNewItem = false;

        // Step 1: Check by code
        if (code) {
            item = await this.itemService.findOneByFilter({ code });
        }

        // Step 2: Fallback to name
        if (!item && name) {
            item = await this.itemService.findOneByFilter({ name });
        }

        // Step 3: Create new Item if not found
        if (!item) {
            item = await this.itemService.create({ name, code: code || undefined });
            isNewItem = true;
        }

        // Step 4: Check & create DataProviderItem
        let dataProviderItem = await this.dataProviderItemService.findOneByFilterAndOptions({
            itemId: item.id,
            dataProviderId: urlEntity.dataProviderId,
            itemUrl: urlEntity.url,
        });

        if (!dataProviderItem) {
            dataProviderItem = await this.dataProviderItemService.create({
                itemId: item.id,
                dataProviderId: urlEntity.dataProviderId,
                itemUrl: urlEntity.url,
            });
        }

        // Step 5: Mark status INGESTED
        await this.urlRepository.update(urlId, { status: DiscoveryUrlStatus.INGESTED });

        return { itemId: item.id, dataProviderItemId: dataProviderItem.id, isNewItem };
    }

    async batchIngest(sessionId: string, urlIds?: string[]): Promise<IngestDiscoveryUrlResponseDto> {
        const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException(`Discovery session not found with id: ${sessionId}`);

        const whereCondition: any = { sessionId };
        if (urlIds && urlIds.length > 0) {
            whereCondition.id = In(urlIds);
        } else {
            whereCondition.finalValidationStatus = FinalValidationStatus.APPROVED;
        }

        const urls = await this.urlRepository.find({ where: whereCondition });
        if (!urls.length) {
            return new IngestDiscoveryUrlResponseDto({
                totalProcessed: 0,
                itemsCreated: 0,
                itemsReused: 0,
                dataProviderItemsCreated: 0,
            });
        }

        let itemsCreated = 0;
        let itemsReused = 0;
        let dataProviderItemsCreated = 0;

        for (const u of urls) {
            try {
                const result = await this.ingestDiscoveredUrl(u.id);
                if (result.isNewItem) {
                    itemsCreated++;
                } else {
                    itemsReused++;
                }
                dataProviderItemsCreated++;
            } catch (error) {
                this.loggerService.error(`Failed to ingest discovery URL ${u.id}: ${error.message}`);
            }
        }

        return new IngestDiscoveryUrlResponseDto({
            totalProcessed: urls.length,
            itemsCreated,
            itemsReused,
            dataProviderItemsCreated,
        });
    }

    async getValidationLogsByUrl(urlId: string): Promise<DiscoveryValidationLogDto[]> {
        const entities = await this.logRepository.find({
            where: { discoveryUrlId: urlId },
            order: { createdAt: 'DESC' },
        });

        return this.mapper.mapArray(entities, DiscoveryValidationLogEntity, DiscoveryValidationLogDto);
    }

    private extractCodeFromUrl(url: string, _title?: string): string | undefined {
        try {
            const parsed = new URL(url);
            const skuParam =
                parsed.searchParams.get('sku') ||
                parsed.searchParams.get('code') ||
                parsed.searchParams.get('productId') ||
                parsed.searchParams.get('id');
            if (skuParam && skuParam.length <= 20) {
                return skuParam;
            }

            const dpMatch = parsed.pathname.match(/\/(?:dp|product|p|item)\/([A-Za-z0-9_-]{3,20})/i);
            if (dpMatch && dpMatch[1]) {
                return dpMatch[1];
            }
        } catch {
            // ignore malformed URL
        }
        return undefined;
    }
}
