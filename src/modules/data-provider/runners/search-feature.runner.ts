import { Inject, Injectable } from '@nestjs/common';

import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
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

        const query = (input?.query || '').trim();
        const pattern = config?.searchUrlPattern?.trim();

        if (!pattern) {
            return '';
        }

        const placeholder = config?.queryPlaceholder?.trim() || '{query}';
        let targetPattern = pattern;

        if (!targetPattern.includes(placeholder) && query) {
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
        if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingSearchTestInput);

        const searchService = this.dataProviderSearchServiceMap[service];
        if (!searchService) throw new AppException(DataProviderError.SearchServiceNotFound(service));

        const result = await searchService.getExtractSearchData({
            url,
            dataContent,
            htmlContentString,
            targetConfig: config,
        });
        if (result.error) throw new AppException(DataProviderError.FeatureTestFailed(result.error));

        return result;
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<ISearchExtractDataResponse> {
        const { htmlContentString, dataContent } = input || {};

        const config = (feature.config || {}) as ISearchTargetConfig;
        const url = this.buildSearchUrl(config, input);
        if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingSearchTestInput);

        const searchService = this.dataProviderSearchServiceMap[feature.service];
        if (!searchService) throw new AppException(DataProviderError.SearchServiceNotFound(feature.service));

        const result = await searchService.getExtractSearchData({
            url,
            dataContent,
            htmlContentString,
            targetConfig: config,
        });

        if (result.error) {
            throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Search validation failed'));
        }

        return result;
    }
}
