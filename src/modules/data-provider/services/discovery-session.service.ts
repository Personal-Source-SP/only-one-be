import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { AppException } from '../../../exceptions/app.exception';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoverySearchJob, IDiscoveryValidationJob } from '../../queue/interfaces';
import { QueueService } from '../../queue/services/queue.service';
import { DataProviderError } from '../constants/data-provider-error';
import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
import { DataProviderDto } from '../dtos/data-provider.dto';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { CreateDiscoverySessionRequestDto } from '../dtos/requests/create-discovery-session-request.dto';
import { DiscoverySessionSummaryResponseDto, SearchResultItemDto } from '../dtos/responses';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import {
    DataProviderFeatureStatus,
    DataProviderFeatureType,
    DiscoverySessionStatus,
    DiscoveryUrlStatus,
    DiscoveryValidationStatus,
    ValidationBatchStatus,
    ValidationMatchResult,
} from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';
import { IDataProviderSearchService, ISearchTargetConfig, ISessionWithSearchFeature } from '../interfaces';
import { SearchFeatureRunner } from '../runners/search-feature.runner';
import { DataProviderService } from './data-provider.service';
import { DiscoveryUrlService } from './discovery-url.service';
import { DiscoveryValidationLogService } from './discovery-validation-log.service';

@Injectable()
export class DiscoverySessionService extends BaseService<DiscoverySessionEntity, DiscoverySessionDto> {
    constructor(
        private readonly queueService: QueueService,
        private readonly searchFeatureRunner: SearchFeatureRunner,
        private readonly dataProviderService: DataProviderService,
        private readonly discoveryUrlService: DiscoveryUrlService,
        @Inject(forwardRef(() => DiscoveryValidationLogService))
        private readonly discoveryValidationLogService: DiscoveryValidationLogService,
        @InjectMapper() mapper: Mapper,
        @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
        private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly discoverySessionRepository: Repository<DiscoverySessionEntity>,
    ) {
        super(discoverySessionRepository, mapper, DiscoverySessionDto, DiscoverySessionService.name);
    }

    async create(request: CreateDiscoverySessionRequestDto, user?: PayloadDto): Promise<DiscoverySessionDto> {
        const dataProvider = await this.dataProviderService.findById(request.dataProviderId, {
            relations: { features: true },
        });

        if (!dataProvider) {
            throw new AppException(DataProviderError.DataProviderWithIdNotFound(request.dataProviderId));
        }

        const searchFeature = dataProvider.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
        if (!searchFeature) {
            throw new AppException(DataProviderError.FeatureTypeNotFound(DataProviderFeatureType.SEARCH, request.dataProviderId));
        }

        if (searchFeature.status !== DataProviderFeatureStatus.READY) {
            throw new AppException(DataProviderError.FeatureNotReady(DataProviderFeatureType.SEARCH, request.dataProviderId));
        }

        const keywords = request.targetKeywords || [];
        const searchConfig = (searchFeature.config || {}) as ISearchTargetConfig;
        const targetUrl = searchConfig.searchUrlPattern || '';
        const maxUrls = request.maxUrls ?? searchConfig.maxResults ?? null;

        const entity = this.mapper.map(request, CreateDiscoverySessionRequestDto, DiscoverySessionEntity);
        entity.sessionCode = this.generateSessionCode(dataProvider);
        entity.maxUrls = maxUrls;
        entity.targetUrl = targetUrl;

        const createdSession = await super.create(entity, user);

        // Enqueue discovery search jobs for each keyword
        const keywordsToProcess = keywords.length > 0 ? keywords : [''];
        for (const keyword of keywordsToProcess) {
            await this.queueService.addJob<IDiscoverySearchJob>(QUEUE_NAME.DISCOVERY_SEARCH_JOB, {
                keyword,
                sessionId: createdSession.id,
            });
        }

        return createdSession;
    }

    async processDiscoverySearch(sessionId: string, keyword: string): Promise<void> {
        const startTime = Date.now();
        await this.discoverySessionRepository.update(sessionId, { status: DiscoverySessionStatus.IN_PROGRESS });

        try {
            const { session, searchFeature } = await this.validateAndGetSessionWithSearchFeature(sessionId);

            const items = await this.fetchAndExtractSearchResults(session, searchFeature, keyword);
            const savedCount = await this.saveDiscoveredUrls(session, items, keyword);

            await this.updateSessionProgress(session, savedCount, startTime);

            if (session.autoValidate && savedCount > 0) {
                this.startSessionValidation(sessionId, keyword).catch((err) =>
                    this.loggerService.error(`Auto-validation failed for session ${sessionId}: ${err.message}`),
                );
            }
        } catch (error) {
            await this.handleSessionError(sessionId, error, startTime);
            throw error;
        }
    }

    async startSessionValidation(sessionId: string, targetKeyword?: string): Promise<DiscoverySessionDto> {
        const session = await this.findById(sessionId);
        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));
        if (session.validationStatus === ValidationBatchStatus.PROCESSING) {
            throw new AppException(DataProviderError.ValidationBatchAlreadyRunning);
        }

        const urls = await this.discoveryUrlService.findListByFilter({ sessionId });
        if (!urls.length) throw new AppException(DataProviderError.NoDiscoveredUrlsFound(sessionId));

        await this.discoverySessionRepository.update(sessionId, {
            matchedUrls: 0,
            noMatchUrls: 0,
            totalValidated: 0,
            validationCompletedAt: null,
            validationReasonCancelled: null,
            validationStartedAt: new Date(),
            validationStatus: ValidationBatchStatus.PROCESSING,
        });

        await this.discoveryValidationLogService.markPreviousLogsNotLatest({ sessionId });

        const jobs = urls.map((u) => ({
            data: {
                sessionId,
                targetKeyword,
                urlId: u.id,
            } as IDiscoveryValidationJob,
            opts: {
                attempts: 3,
                removeOnComplete: true,
                backoff: { type: 'exponential', delay: 1000 },
            },
        }));

        await this.queueService.addBulkJob(QUEUE_NAME.DISCOVERY_VALIDATION_JOB, jobs);
        return await this.findById(sessionId);
    }

    async cancelSessionValidation(sessionId: string, reason?: string): Promise<boolean> {
        const session = await this.findById(sessionId);
        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));

        const result = await this.discoverySessionRepository.update(sessionId, {
            validationReasonCancelled: reason,
            validationCompletedAt: new Date(),
            validationStatus: ValidationBatchStatus.CANCELLED,
        });

        return (result.affected ?? 0) > 0;
    }

    async getSessionSummary(sessionId: string): Promise<DiscoverySessionSummaryResponseDto> {
        const session = await this.findById(sessionId, { relations: { dataProvider: true } });
        if (!session) {
            throw new AppException(DataProviderError.SessionNotFound(sessionId));
        }

        const [exactMatches, partialMatches, noMatches] = await Promise.all([
            this.discoveryUrlService.count({ sessionId, matchResult: ValidationMatchResult.EXACT_MATCH }),
            this.discoveryUrlService.count({ sessionId, matchResult: ValidationMatchResult.PARTIAL_MATCH }),
            this.discoveryUrlService.count({ sessionId, matchResult: ValidationMatchResult.NO_MATCH }),
        ]);

        return new DiscoverySessionSummaryResponseDto({
            session,
            noMatches,
            exactMatches,
            partialMatches,
            totalQueued: session.totalQueued,
            totalDiscovered: session.totalDiscovered,
        });
    }

    private generateSessionCode(dataProvider: DataProviderDto): string {
        const prefix = (dataProvider.identifier || dataProvider.name || 'PRV')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 4);

        const randomSuffix = Math.floor(100 + Math.random() * 900);

        return `DISC-${prefix}-${randomSuffix}`;
    }

    private safeGetHostname(urlStr: string): string | undefined {
        try {
            return new URL(urlStr).hostname;
        } catch {
            return undefined;
        }
    }

    private async validateAndGetSessionWithSearchFeature(sessionId: string): Promise<ISessionWithSearchFeature> {
        const session = await this.discoverySessionRepository.findOne({
            where: { id: sessionId },
            relations: ['dataProvider', 'dataProvider.features'],
        });
        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));

        const searchFeature = session.dataProvider?.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
        if (!searchFeature) {
            throw new AppException(DataProviderError.FeatureTypeNotFound(DataProviderFeatureType.SEARCH, session.dataProviderId));
        }

        if (searchFeature.status !== DataProviderFeatureStatus.READY) {
            throw new AppException(DataProviderError.FeatureNotReady(DataProviderFeatureType.SEARCH, session.dataProviderId));
        }

        return { session, searchFeature };
    }

    private async fetchAndExtractSearchResults(
        session: DiscoverySessionEntity,
        searchFeature: DataProviderFeatureEntity,
        keyword: string,
    ): Promise<SearchResultItemDto[]> {
        const searchService = this.dataProviderSearchServiceMap[searchFeature.service];
        if (!searchService) throw new AppException(DataProviderError.SearchServiceNotFound(searchFeature.service));

        const targetConfig = (searchFeature.config || {}) as ISearchTargetConfig;
        const searchUrl = this.searchFeatureRunner.buildSearchUrl(targetConfig, { query: keyword }) || session.targetUrl || '';

        if (!searchUrl) {
            this.loggerService.warn(`Search URL is empty for keyword "${keyword}" in session ${session.id}`);
            return [];
        }

        const searchResult = await searchService.getExtractSearchData({
            targetConfig,
            url: searchUrl,
        });
        if (searchResult.error) throw new Error(searchResult.error);

        return searchResult.data || [];
    }

    private async saveDiscoveredUrls(session: DiscoverySessionEntity, items: SearchResultItemDto[], keyword: string): Promise<number> {
        const existingUrls = await this.discoveryUrlService.findListByFilter({ sessionId: session.id }, { select: { url: true } });

        const seenUrls = new Set(existingUrls.map((u) => u.url));
        const fallbackDomain = this.safeGetHostname(session.targetUrl || '') || 'domain';
        const remainingCapacity = session.maxUrls != null ? Math.max(0, session.maxUrls - existingUrls.length) : Infinity;

        const validItems = items
            .filter((item) => {
                if (!item.url || seenUrls.has(item.url)) return false;
                seenUrls.add(item.url);

                return true;
            })
            .slice(0, remainingCapacity);

        const discoveredRecords = validItems.map((item) => {
            const domain = this.safeGetHostname(item.url) || fallbackDomain;
            const evalResult = DiscoveryValidationHelper.evaluateUrl({
                domain,
                url: item.url,
                title: item.title,
                targetKeyword: keyword,
            });

            const urlEntity = new DiscoveryUrlEntity();
            urlEntity.domain = domain;
            urlEntity.foundAtDepth = 1;
            urlEntity.sessionId = session.id;
            urlEntity.dataProviderId = session.dataProviderId;
            urlEntity.url = item.url;
            urlEntity.title = item.title;
            urlEntity.description = item.description;
            urlEntity.matchResult = evalResult.matchResult;
            urlEntity.confidenceScore = evalResult.confidenceScore;
            urlEntity.status = DiscoveryUrlStatus.DISCOVERED;
            urlEntity.validationStatus = DiscoveryValidationStatus.COMPLETED;

            return urlEntity;
        });

        if (discoveredRecords.length > 0) {
            await this.discoveryUrlService.createMany(discoveredRecords);
        }

        return discoveredRecords.length;
    }

    private async updateSessionProgress(session: DiscoverySessionEntity, savedCount: number, startTime: number): Promise<boolean> {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const currentTotalDiscovered = (session.totalDiscovered || 0) + savedCount;
        const currentTotalValidated = (session.totalValidated || 0) + savedCount;

        const result = await this.discoverySessionRepository.update(session.id, {
            durationSeconds,
            status: DiscoverySessionStatus.COMPLETED,
            totalValidated: currentTotalValidated,
            totalDiscovered: currentTotalDiscovered,
        });

        return (result.affected ?? 0) > 0;
    }

    private async handleSessionError(sessionId: string, error: any, startTime: number): Promise<void> {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        await this.discoverySessionRepository.update(sessionId, {
            durationSeconds,
            errorMessage: error?.message || String(error),
            status: DiscoverySessionStatus.FAILED,
        });
    }
}
