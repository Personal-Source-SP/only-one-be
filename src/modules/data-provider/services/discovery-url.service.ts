import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { MimeType } from '../../../common/enums';
import { DISCOVERY_URL_PAGINATION_CONFIG } from '../constants/discovery-url-pagination.config';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
import { ScrapingDataEntity } from '../entities/scraping-data.entity';
import { DiscoveryUrlStatus } from '../enums';

@Injectable()
export class DiscoveryUrlService extends BaseService<DiscoveryUrlEntity, DiscoveryUrlDto> {
    constructor(
        @InjectRepository(DiscoveryUrlEntity)
        private readonly urlRepository: Repository<DiscoveryUrlEntity>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepository: Repository<DiscoverySessionEntity>,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly logRepository: Repository<DiscoveryValidationLogEntity>,
        @InjectMapper() mapper: Mapper,
        private readonly dataSource: DataSource,
    ) {
        super(urlRepository, mapper, DiscoveryUrlDto, DiscoveryUrlService.name);
    }

    async batchEnqueue(sessionId: string, urlIds: string[]): Promise<{ enqueuedCount: number }> {
        const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException(`Discovery session not found with id: ${sessionId}`);

        return await this.dataSource.transaction(async (manager) => {
            const urls = await manager.find(DiscoveryUrlEntity, {
                where: {
                    id: In(urlIds),
                    sessionId,
                },
            });

            if (!urls.length) return { enqueuedCount: 0 };

            await manager.update(DiscoveryUrlEntity, { id: In(urls.map((u) => u.id)) }, { status: DiscoveryUrlStatus.QUEUED });

            // Create ScrapingData entries for ingestion into scraping runner
            const scrapingRecords = urls.map((u) => {
                return manager.create(ScrapingDataEntity, {
                    dataProviderId: u.dataProviderId,
                    url: u.url,
                    type: MimeType.DOCUMENT,
                    dataId: `DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    metadata: {
                        discoverySessionId: sessionId,
                        discoveryUrlId: u.id,
                        title: u.title,
                    },
                });
            });
            await manager.save(ScrapingDataEntity, scrapingRecords);

            const totalQueued = await manager.count(DiscoveryUrlEntity, {
                where: { sessionId, status: DiscoveryUrlStatus.QUEUED },
            });
            await manager.update(DiscoverySessionEntity, sessionId, { totalQueued });

            return { enqueuedCount: urls.length };
        });
    }

    async getValidationLogsByUrl(urlId: string): Promise<DiscoveryValidationLogEntity[]> {
        return await this.logRepository.find({
            where: { discoveryUrlId: urlId },
            order: { createdAt: 'DESC' },
        });
    }
}
