import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { DISCOVERY_SESSION_PAGINATION_CONFIG } from '../constants/discovery-session-pagination.config';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { CreateDiscoverySessionRequestDto } from '../dtos/requests/create-discovery-session-request.dto';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoverySessionStatus, ValidationMatchResult } from '../enums';
import { DiscoveryRunnerService } from './discovery-runner.service';

@Injectable()
export class DiscoverySessionService extends BaseService<DiscoverySessionEntity, DiscoverySessionDto> {
    constructor(
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepository: Repository<DiscoverySessionEntity>,
        @InjectRepository(DataProviderEntity)
        private readonly dataProviderRepository: Repository<DataProviderEntity>,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
        @InjectMapper() mapper: Mapper,
        @Inject(forwardRef(() => DiscoveryRunnerService))
        private readonly discoveryRunnerService: DiscoveryRunnerService,
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

        const prefix = (dataProvider.identifier || dataProvider.name || 'PRV')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 4);
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const sessionCode = `DISC-${prefix}-${randomSuffix}`;

        const newSession = this.sessionRepository.create({
            sessionCode,
            dataProviderId: request.dataProviderId,
            targetUrl: request.targetUrl,
            status: DiscoverySessionStatus.PENDING,
            depth: request.depth || 1,
            maxUrls: request.maxUrls || 100,
            notes: request.notes,
            totalDiscovered: 0,
            totalQueued: 0,
            totalValidated: 0,
        });

        const createdSession = (await this.create(newSession, user)) as DiscoverySessionDto;

        // Run background crawling job asynchronously
        this.discoveryRunnerService
            .runDiscovery(createdSession.id, request.targetKeyword)
            .catch((err) => this.loggerService.error(`Discovery runner error: ${err.message}`));

        return createdSession;
    }

    async getSessionSummary(sessionId: string): Promise<{
        session: DiscoverySessionDto;
        exactMatches: number;
        partialMatches: number;
        noMatches: number;
        totalDiscovered: number;
        totalQueued: number;
    }> {
        const session = await this.findById(sessionId, { relations: { dataProvider: true } as any });
        if (!session) {
            throw new NotFoundException(`Discovery session not found with id: ${sessionId}`);
        }

        const exactMatches = await this.discoveryUrlRepository.count({
            where: { sessionId, matchResult: ValidationMatchResult.EXACT_MATCH },
        });
        const partialMatches = await this.discoveryUrlRepository.count({
            where: { sessionId, matchResult: ValidationMatchResult.PARTIAL_MATCH },
        });
        const noMatches = await this.discoveryUrlRepository.count({
            where: { sessionId, matchResult: ValidationMatchResult.NO_MATCH },
        });

        return {
            session,
            exactMatches,
            partialMatches,
            noMatches,
            totalDiscovered: session.totalDiscovered,
            totalQueued: session.totalQueued,
        };
    }
}
