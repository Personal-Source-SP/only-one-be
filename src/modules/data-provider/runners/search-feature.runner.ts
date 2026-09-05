import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { IDataProviderScraperService, IExtractDataResponse, IFeatureRunner, ISearchTargetConfig } from '../interfaces';

@Injectable()
export class SearchFeatureRunner implements IFeatureRunner<ISearchTargetConfig, any, IExtractDataResponse | any> {
    constructor(
        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
    ) {}

    public buildSearchUrl(config: ISearchTargetConfig, input?: any): string {
        if (input?.url) {
            return input.url;
        }

        const query = (input?.query || config?.sampleQuery || '').trim();
        const pattern = config?.searchUrlPattern?.trim();

        if (!pattern) {
            return '';
        }

        if (!query) {
            return pattern;
        }

        const placeholder = config?.queryPlaceholder || '{query}';
        const encodedQuery = encodeURIComponent(query);

        if (pattern.includes(placeholder)) {
            return pattern.split(placeholder).join(encodedQuery);
        }

        const commonPlaceholders = ['${query}', '{keyword}', '${keyword}', '{q}', '${q}'];
        for (const ph of commonPlaceholders) {
            if (pattern.includes(ph)) {
                return pattern.split(ph).join(encodedQuery);
            }
        }

        const separator = pattern.includes('?') ? '&' : '?';
        return `${pattern}${separator}q=${encodedQuery}`;
    }

    async testStateless(service: string, config: ISearchTargetConfig, input: any): Promise<IExtractDataResponse> {
        const { htmlContentString, dataContent } = input || {};
        const url = this.buildSearchUrl(config, input);

        if (!url && !dataContent && !htmlContentString) {
            throw new BadRequestException('Search query, searchUrlPattern, URL or Html content is required');
        }

        const scraperService = this.dataProviderScraperServiceMap[service];
        if (!scraperService) {
            throw new BadRequestException(`Scraper service '${service}' not found`);
        }

        return await scraperService.getExtractData({
            url,
            dataContent,
            targetConfig: config,
            htmlContentString,
        });
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<any> {
        const config = (feature.config || {}) as ISearchTargetConfig;
        const { htmlContentString, dataContent } = input || {};
        const url = this.buildSearchUrl(config, input);

        if (!url && !dataContent && !htmlContentString) {
            throw new BadRequestException('Search query, searchUrlPattern, or item URL is required to test contextual search');
        }

        const scraperService = this.dataProviderScraperServiceMap[feature.service];
        if (!scraperService) {
            throw new BadRequestException(`Scraper service '${feature.service}' not found`);
        }

        const result = await scraperService.getExtractData({
            url,
            dataContent,
            targetConfig: config,
            htmlContentString,
        });

        if (result.error) {
            throw new BadRequestException(result.error || 'Search scraping validation failed');
        }

        return result;
    }
}
