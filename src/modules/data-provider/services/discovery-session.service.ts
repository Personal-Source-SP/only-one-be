import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { CreateDiscoverySessionRequestDto } from '../dtos/requests/create-discovery-session-request.dto';
import { DiscoverySessionSummaryResponseDto, IngestDiscoveryUrlResponseDto } from '../dtos/responses';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { ValidationMatchResult } from '../enums';
import { DiscoveryRunner } from '../runners/discovery.runner';
import { DiscoveryUrlService } from './discovery-url.service';

@Injectable()
export class DiscoverySessionService extends BaseService<DiscoverySessionEntity, DiscoverySessionDto> {
    constructor(
        @Inject(forwardRef(() => DiscoveryRunner))
        private readonly discoveryRunner: DiscoveryRunner,
        @Inject(forwardRef(() => DiscoveryUrlService))
        private readonly discoveryUrlService: DiscoveryUrlService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepository: Repository<DiscoverySessionEntity>,
        @InjectRepository(DataProviderEntity)
        private readonly dataProviderRepository: Repository<DataProviderEntity>,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
    ) {
        super(sessionRepository, mapper, DiscoverySessionDto, DiscoverySessionService.name);
    }

    async createSession(request: CreateDiscoverySessionRequestDto, user?: PayloadDto): Promise<DiscoverySessionDto> {
        const dataProvider = await this.dataProviderRepository.findOne({
            where: { id: request.dataProviderId },
        });

        if (!dataProvider) {
            throw new NotFoundException(`Data Provider not found with id: ${request.dataProviderId}`);
        }

        const entity = this.mapper.map(request, CreateDiscoverySessionRequestDto, DiscoverySessionEntity);
        entity.sessionCode = this.generateSessionCode(dataProvider);

        const createdSession = await this.create(entity, user);

        // Run background crawling job asynchronously
        this.discoveryRunner
            .runDiscovery(createdSession.id, request.targetKeyword)
            .catch((err) => this.loggerService.error(`Discovery runner error: ${err.message}`));

        return createdSession;
    }

    async getSessionSummary(sessionId: string): Promise<DiscoverySessionSummaryResponseDto> {
        const session = await this.findById(sessionId, { relations: { dataProvider: true } });
        if (!session) {
            throw new NotFoundException(`Discovery session not found with id: ${sessionId}`);
        }

        const [exactMatches, partialMatches, noMatches] = await Promise.all([
            this.discoveryUrlRepository.count({
                where: { sessionId, matchResult: ValidationMatchResult.EXACT_MATCH },
            }),
            this.discoveryUrlRepository.count({
                where: { sessionId, matchResult: ValidationMatchResult.PARTIAL_MATCH },
            }),
            this.discoveryUrlRepository.count({
                where: { sessionId, matchResult: ValidationMatchResult.NO_MATCH },
            }),
        ]);

        return new DiscoverySessionSummaryResponseDto({
            session,
            exactMatches,
            partialMatches,
            noMatches,
            totalDiscovered: session.totalDiscovered,
            totalQueued: session.totalQueued,
        });
    }

    async batchIngestUrls(sessionId: string, urlIds?: string[]): Promise<IngestDiscoveryUrlResponseDto> {
        return await this.discoveryUrlService.batchIngest(sessionId, urlIds);
    }

    private generateSessionCode(dataProvider: DataProviderEntity): string {
        const prefix = (dataProvider.identifier || dataProvider.name || 'PRV')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 4);

        const randomSuffix = Math.floor(100 + Math.random() * 900);

        return `DISC-${prefix}-${randomSuffix}`;
    }
}
