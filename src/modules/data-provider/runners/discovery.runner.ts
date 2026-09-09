import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as cheerio from 'cheerio';
import { Repository } from 'typeorm';

import { AppException } from '../../../exceptions/app.exception';
import { ApiFetcherService } from '../../../shared/services/api-fetcher.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { HtmlFetcherService } from '../../../shared/services/html-fetcher.service';
import { DataProviderError } from '../constants/data-provider-error';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import {
    DataProviderFeatureType,
    DiscoverySessionStatus,
    DiscoveryUrlStatus,
    DiscoveryValidationStatus,
    ScraperServiceEnum,
} from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';
import { ExtractDataHelper } from '../helpers/extract-data.helper';
import {
    IDiscoveryCrawlQueueItem,
    IDiscoveryExtractedItem,
    IDiscoveryFetchHtmlResult,
    IRunDiscoveryParams,
    ITargetConfig,
} from '../interfaces';
import { DiscoveryValidationService } from '../services/discovery-validation.service';

@Injectable()
export class DiscoveryRunner {
    private readonly logger = new Logger(DiscoveryRunner.name);

    constructor(
        private readonly baseHttpService: BaseHttpService,
        private readonly extractDataHelper: ExtractDataHelper,
        private readonly apiFetcherService: ApiFetcherService,
        private readonly htmlFetcherService: HtmlFetcherService,
        private readonly validationService: DiscoveryValidationService,
        @InjectRepository(DiscoverySessionEntity)
        private readonly discoverySessionRepository: Repository<DiscoverySessionEntity>,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
    ) {}

    async runDiscovery(sessionId: string, targetKeyword?: string): Promise<void> {
        const session = await this.discoverySessionRepository.findOne({
            where: { id: sessionId },
            relations: ['dataProvider', 'dataProvider.features'],
        });
        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));

        const searchFeature = session.dataProvider?.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
        if (!searchFeature)
            throw new AppException(DataProviderError.FeatureTypeNotFound(DataProviderFeatureType.SEARCH, session.dataProviderId));

        const startTime = Date.now();

        // Update session status to IN_PROGRESS when first job is processed
        await this.discoverySessionRepository.update(sessionId, { status: DiscoverySessionStatus.IN_PROGRESS });

        try {
            const targetConfig = searchFeature?.config as ITargetConfig;
            const isApiProvider = searchFeature?.service === ScraperServiceEnum.API;
            const params: IRunDiscoveryParams = {
                session,
                targetConfig,
                targetKeyword,
            };

            const discoveredRecords: DiscoveryUrlEntity[] = isApiProvider
                ? await this.runApiDiscovery(params)
                : await this.runHtmlDiscovery(params);

            if (discoveredRecords.length > 0) {
                await this.discoveryUrlRepository.save(discoveredRecords, { chunk: 100 });
            }

            const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
            await this.discoverySessionRepository.update(sessionId, {
                durationSeconds,
                status: DiscoverySessionStatus.COMPLETED,
                totalValidated: discoveredRecords.length,
                totalDiscovered: discoveredRecords.length,
            });

            // Trigger auto-validation batch if autoValidate is enabled and URLs were discovered
            if (session.autoValidate && discoveredRecords.length > 0) {
                this.validationService
                    .startBatchValidation(sessionId, targetKeyword)
                    .catch((err) => this.logger.error(`Auto-validation failed for session ${sessionId}: ${err.message}`));
            }
        } catch (error) {
            const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
            await this.discoverySessionRepository.update(sessionId, {
                durationSeconds,
                errorMessage: error.message,
                status: DiscoverySessionStatus.FAILED,
            });
        }
    }

    private safeGetHostname(urlStr: string): string | undefined {
        try {
            return new URL(urlStr).hostname;
        } catch {
            return undefined;
        }
    }

    private async runApiDiscovery(params: IRunDiscoveryParams): Promise<DiscoveryUrlEntity[]> {
        const { session, targetConfig, targetKeyword } = params;
        const discoveredRecords: DiscoveryUrlEntity[] = [];

        if (!targetConfig?.functionGenerator) {
            throw new Error(`Data provider feature is missing 'functionGenerator' configuration for session ${session.id}`);
        }

        const apiRes = await this.apiFetcherService.getApiContent(session.targetUrl, targetConfig);
        if (apiRes.status !== 'success' || !apiRes.data) {
            this.logger.warn(`API fetch failed for session ${session.id}: ${apiRes.error_message}`);
            return discoveredRecords;
        }

        const rawData = apiRes.data;
        const result = await this.extractDataHelper.runApiFunctionExtractData({
            data: rawData,
            functionGenerator: targetConfig.functionGenerator,
        });

        if (!Array.isArray(result) || result.length === 0) {
            this.logger.warn(`API functionGenerator returned 0 items for session ${session.id}`);
            return discoveredRecords;
        }

        const extractedItems: IDiscoveryExtractedItem[] = result.map((item: any) => ({
            description: item.description,
            title: item.title || item.name || item.productName,
            url: item.url || item.link || item.productUrl || item.itemUrl || session.targetUrl,
        }));

        const fallbackDomain = this.safeGetHostname(session.targetUrl) || 'api';

        for (const item of extractedItems) {
            if (session.maxUrls != null && discoveredRecords.length >= session.maxUrls) break;

            const domain = this.safeGetHostname(item.url) || fallbackDomain;
            const evalResult = DiscoveryValidationHelper.evaluateUrl({
                domain,
                targetKeyword,
                url: item.url,
                title: item.title,
            });

            const urlEntity = this.discoveryUrlRepository.create({
                domain,
                foundAtDepth: 1,
                sessionId: session.id,
                dataProviderId: session.dataProviderId,
                url: item.url,
                title: item.title,
                description: item.description,
                status: DiscoveryUrlStatus.DISCOVERED,
                matchResult: evalResult.matchResult,
                confidenceScore: evalResult.confidenceScore,
                validationStatus: DiscoveryValidationStatus.COMPLETED,
            });

            discoveredRecords.push(urlEntity);
        }

        return discoveredRecords;
    }

    private async runHtmlDiscovery(params: IRunDiscoveryParams): Promise<DiscoveryUrlEntity[]> {
        const { session, targetConfig, targetKeyword } = params;
        const discoveredRecords: DiscoveryUrlEntity[] = [];
        const visited = new Set<string>();
        const queue: IDiscoveryCrawlQueueItem[] = [{ url: session.targetUrl, depth: 0 }];

        const parsedBase = new URL(session.targetUrl);
        const targetHostname = parsedBase.hostname;

        while (queue.length > 0 && (session.maxUrls == null || discoveredRecords.length < session.maxUrls)) {
            const current = queue.shift()!;
            if (visited.has(current.url) || current.depth > session.depth) continue;
            visited.add(current.url);

            try {
                const { html, title: scrapedTitle } = await this.fetchHtml(current.url, targetConfig);

                const $ = cheerio.load(html);
                const title = scrapedTitle || $('title').text().trim() || undefined;
                const description =
                    $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || undefined;

                if (current.depth > 0) {
                    const parsedDomain = new URL(current.url).hostname;
                    const evalResult = DiscoveryValidationHelper.evaluateUrl({
                        url: current.url,
                        title,
                        targetKeyword,
                        domain: parsedDomain,
                    });

                    const urlEntity = this.discoveryUrlRepository.create({
                        title,
                        description,
                        domain: parsedDomain,
                        sessionId: session.id,
                        dataProviderId: session.dataProviderId,
                        url: current.url,
                        foundAtDepth: current.depth,
                        matchResult: evalResult.matchResult,
                        confidenceScore: evalResult.confidenceScore,
                        status: DiscoveryUrlStatus.DISCOVERED,
                        validationStatus: DiscoveryValidationStatus.COMPLETED,
                    });
                    discoveredRecords.push(urlEntity);
                }

                if (current.depth < session.depth && (session.maxUrls == null || discoveredRecords.length < session.maxUrls)) {
                    $('a[href]').each((_, el) => {
                        const href = $(el).attr('href');
                        if (!href) return;
                        try {
                            const resolved = new URL(href, current.url);
                            resolved.hash = ''; // Remove fragments
                            if (
                                resolved.hostname === targetHostname &&
                                !visited.has(resolved.href) &&
                                !resolved.href.match(/\.(jpg|jpeg|png|gif|pdf|zip|css|js|svg|ico)$/i)
                            ) {
                                queue.push({ url: resolved.href, depth: current.depth + 1 });
                            }
                        } catch {
                            // Skip malformed or unsupported URLs
                        }
                    });
                }
            } catch (err: any) {
                this.logger.warn(`Failed to crawl URL: ${current.url} - ${err.message}`);
            }
        }

        return discoveredRecords;
    }

    private async fetchHtml(url: string, targetConfig?: ITargetConfig): Promise<IDiscoveryFetchHtmlResult> {
        const isDynamicOrProtected =
            targetConfig &&
            (targetConfig.stealthMode ||
                targetConfig.cloudflareBypass ||
                targetConfig.javascriptEnabled === true ||
                targetConfig.waitForSelector);

        if (isDynamicOrProtected) {
            try {
                const result = await this.htmlFetcherService.getHtmlContent(url, targetConfig);
                if (result.status === 'success' && result.html) {
                    return { html: result.html, title: result.title };
                }
                this.logger.warn(`Puppeteer scraping failed for ${url}: ${result.error_message}. Falling back to HTTP request.`);
            } catch (err: any) {
                this.logger.warn(`Puppeteer scraping error for ${url}: ${err.message}. Falling back to HTTP request.`);
            }
        }

        const response = await this.baseHttpService.get<string>(url, {
            timeout: targetConfig?.timeout || 10000,
            headers: {
                'User-Agent':
                    targetConfig?.userAgent ||
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...(targetConfig?.headers || {}),
            },
        });

        return { html: response.data };
    }
}
