import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { IDataProviderSearchService, IFeatureRunner, ISearchExtractDataResponse, ISearchTargetConfig } from '../interfaces';

@Injectable()
export class SearchFeatureRunner implements IFeatureRunner<ISearchTargetConfig, any, ISearchExtractDataResponse> {
    constructor(
        @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
        private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
    ) {}

    buildSearchUrl(config: ISearchTargetConfig, input?: any): string {
        if (input?.url) {
            return input.url;
        }

        const query = (input?.query || config?.sampleQuery || '').trim();
        const pattern = config?.searchUrlPattern?.trim();

        if (!pattern) {
            return '';
        }

        const placeholder = config?.queryPlaceholder?.trim() || '{query}';
        let targetPattern = pattern;

        if (!targetPattern.includes(placeholder)) {
            const hasAnyPlaceholder = /\{[a-zA-Z0-9_-]+\}/.test(targetPattern);
            if (!hasAnyPlaceholder) {
                const cleanPlaceholder = placeholder.startsWith('/') ? placeholder.slice(1) : placeholder;
                targetPattern = targetPattern.endsWith('/')
                    ? `${targetPattern}${cleanPlaceholder}`
                    : `${targetPattern}/${cleanPlaceholder}`;
            }
        }

        if (!query) {
            return targetPattern;
        }

        const encodedQuery = encodeURIComponent(query);
        if (targetPattern.includes(placeholder)) {
            return targetPattern.split(placeholder).join(encodedQuery);
        }

        return targetPattern.replace(/\{[a-zA-Z0-9_-]+\}/g, encodedQuery);
    }

    async testStateless(service: string, config: ISearchTargetConfig, input: any): Promise<ISearchExtractDataResponse> {
        const { htmlContentString, dataContent } = input || {};
        const url = this.buildSearchUrl(config, input);

        if (!url && !dataContent && !htmlContentString) {
            throw new BadRequestException('Search query, searchUrlPattern, URL or Html content is required');
        }

        const searchService = this.dataProviderSearchServiceMap[service];
        if (!searchService) {
            throw new BadRequestException(`Search service '${service}' not found`);
        }

        return await searchService.getExtractSearchData({
            url,
            dataContent,
            targetConfig: config,
            htmlContentString,
        });
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<ISearchExtractDataResponse> {
        const config = (feature.config || {}) as ISearchTargetConfig;
        const { htmlContentString, dataContent } = input || {};
        const url = this.buildSearchUrl(config, input);

        if (!url && !dataContent && !htmlContentString) {
            throw new BadRequestException('Search query, searchUrlPattern, or item URL is required to test contextual search');
        }

        const searchService = this.dataProviderSearchServiceMap[feature.service];
        if (!searchService) {
            throw new BadRequestException(`Search service '${feature.service}' not found`);
        }

        const result = await searchService.getExtractSearchData({
            url,
            dataContent,
            targetConfig: config,
            htmlContentString,
        });

        if (result.error) {
            throw new BadRequestException(result.error || 'Search validation failed');
        }

        return result;
    }
}
