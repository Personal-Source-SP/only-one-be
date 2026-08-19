import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { IDataProviderSearchService, ISearchConfig } from '../interfaces';
import { IFeatureRunner } from './interfaces/feature-runner.interface';

@Injectable()
export class SearchFeatureRunner implements IFeatureRunner<ISearchConfig, any, any> {
    constructor(
        @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
        private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
    ) {}

    async testStateless(service: string, config: ISearchConfig, input: any): Promise<any> {
        const searchService = this.dataProviderSearchServiceMap[service];
        if (!searchService) {
            throw new BadRequestException(`Search service '${service}' not found`);
        }

        const { searchQuery, baseUrl, barcode } = input || {};
        if (!searchQuery && !barcode) {
            throw new BadRequestException('searchQuery or barcode is required for search test');
        }

        return await searchService.validateSearchConfiguration({
            searchQuery: searchQuery || '',
            searchConfig: config,
            baseUrl: baseUrl || 'https://example.com',
        });
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<any> {
        const searchService = this.dataProviderSearchServiceMap[feature.service];
        if (!searchService) {
            throw new BadRequestException(`Search service '${feature.service}' not found`);
        }

        const searchQuery = input?.searchQuery || 'test';
        const baseUrl = feature.dataProvider?.baseUrl || 'https://example.com';

        const result = await searchService.validateSearchConfiguration({
            searchQuery,
            searchConfig: feature.config as ISearchConfig,
            baseUrl,
        });

        return result;
    }
}
