import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Repository } from 'typeorm';

import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoverySessionStatus, DiscoveryUrlStatus, DiscoveryValidationStatus } from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';

@Injectable()
export class DiscoveryRunnerService {
    private readonly logger = new Logger(DiscoveryRunnerService.name);

    constructor(
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepo: Repository<DiscoverySessionEntity>,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly urlRepo: Repository<DiscoveryUrlEntity>,
    ) {}

    async runDiscovery(sessionId: string, targetKeyword?: string): Promise<void> {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
            relations: ['dataProvider'],
        });
        if (!session) return;

        const startTime = Date.now();
        await this.sessionRepo.update(sessionId, { status: DiscoverySessionStatus.IN_PROGRESS });

        try {
            const visited = new Set<string>();
            const queue: Array<{ url: string; depth: number }> = [{ url: session.targetUrl, depth: 0 }];
            const discoveredRecords: DiscoveryUrlEntity[] = [];

            const parsedBase = new URL(session.targetUrl);
            const targetHostname = parsedBase.hostname;

            while (queue.length > 0 && discoveredRecords.length < session.maxUrls) {
                const current = queue.shift()!;
                if (visited.has(current.url) || current.depth > session.depth) continue;
                visited.add(current.url);

                try {
                    const response = await axios.get(current.url, {
                        timeout: 10000,
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        },
                    });

                    const $ = cheerio.load(response.data);
                    const title = $('title').text().trim() || undefined;
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

                        const urlEntity = this.urlRepo.create({
                            sessionId: session.id,
                            dataProviderId: session.dataProviderId,
                            url: current.url,
                            domain: parsedDomain,
                            title,
                            description,
                            status: DiscoveryUrlStatus.DISCOVERED,
                            foundAtDepth: current.depth,
                            confidenceScore: evalResult.confidenceScore,
                            priceDetected: evalResult.priceDetected,
                            detectedPrice: evalResult.detectedPrice,
                            detectedCurrency: evalResult.detectedCurrency,
                            validationStatus: DiscoveryValidationStatus.COMPLETED,
                            matchResult: evalResult.matchResult,
                        });
                        discoveredRecords.push(urlEntity);
                    }

                    if (current.depth < session.depth && discoveredRecords.length < session.maxUrls) {
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

            if (discoveredRecords.length > 0) {
                await this.urlRepo.save(discoveredRecords, { chunk: 100 });
            }

            const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
            await this.sessionRepo.update(sessionId, {
                status: DiscoverySessionStatus.COMPLETED,
                totalDiscovered: discoveredRecords.length,
                totalValidated: discoveredRecords.length,
                durationSeconds,
            });
        } catch (error: any) {
            const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
            await this.sessionRepo.update(sessionId, {
                status: DiscoverySessionStatus.FAILED,
                durationSeconds,
                errorMessage: error.message,
            });
        }
    }
}
