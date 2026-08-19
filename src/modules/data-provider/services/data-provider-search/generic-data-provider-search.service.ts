import { Injectable, Logger } from '@nestjs/common';
import { isEmpty } from 'lodash';

import {
    DiscoveredProductDto,
    ExtractSearchResultsResponse,
    SearchProductsResponseDto,
    ValidateSearchConfigurationResponseDto,
} from '../../dtos/responses/search-products-response.dto';
import { DataProviderFeatureType } from '../../enums';
import { ExtractDataHelper } from '../../helpers/extract-data.helper';
import {
    IDataProviderSearchService,
    IFilterSearchResultsDto,
    IGetSearchResultsDto,
    IPrepareRequestOptionsResponse,
    ISearchProductsDto,
    IValidateSearchConfigurationDto,
} from '../../interfaces/data-provider-search-service.interface';
import { IScraperRequest } from '../../interfaces/scraper.interface';
import { ISearchConfig } from '../../interfaces/search-config.interface';
import { ScraperService } from '../scraper.service';

@Injectable()
export class GenericDataProviderSearchService implements IDataProviderSearchService {
    private readonly logger = new Logger(GenericDataProviderSearchService.name);

    constructor(
        private readonly scraperService: ScraperService,
        private readonly extractDataHelper: ExtractDataHelper,
    ) {}

    async searchProducts(dto: ISearchProductsDto): Promise<SearchProductsResponseDto> {
        const { dataProvider, searchQuery, options, barcode } = dto;
        const searchFeature = dataProvider?.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
        const searchConfig: ISearchConfig = searchFeature?.config as ISearchConfig;

        if (isEmpty(searchConfig)) {
            const errRes = new SearchProductsResponseDto({
                searchQuery,
                status: 'error',
                dataProviderId: dataProvider.id,
                error: 'Search config is missing',
            });
            return errRes;
        }

        const finalSearchQuery = searchConfig?.enableBarcodeSearch && barcode ? barcode : searchQuery;
        const defaultResponse = new SearchProductsResponseDto({
            searchQuery: finalSearchQuery,
            status: 'error',
            dataProviderId: dataProvider.id,
        });

        const requestOptions = await this.prepareRequestOptions(dataProvider.baseUrl, finalSearchQuery, searchConfig);
        if (requestOptions?.error) {
            const errRes = new SearchProductsResponseDto({ ...defaultResponse, error: requestOptions.error });
            return errRes;
        }

        try {
            const searchResults = await this.getSearchResults({
                options,
                searchQuery: finalSearchQuery,
                searchConfig,
                baseUrl: dataProvider.baseUrl,
                requestOptions: requestOptions.data,
            });

            if (searchResults?.error) {
                const errRes = new SearchProductsResponseDto({
                    ...defaultResponse,
                    error: searchResults.error,
                    request: requestOptions.data,
                });
                return errRes;
            }

            const successRes = new SearchProductsResponseDto({
                ...defaultResponse,
                status: 'success',
                html: searchResults.html,
                request: requestOptions.data,
                searchUrl: requestOptions.data?.url,
                discoveredProducts: searchResults.discoveredProducts,
                totalResults: searchResults.discoveredProducts?.length || 0,
            });
            return successRes;
        } catch (error) {
            this.logger.error(`Error search products: ${error?.message}`);
            const errRes = new SearchProductsResponseDto({ ...defaultResponse, error: error?.message || 'Unknown error' });
            return errRes;
        }
    }

    async validateSearchConfiguration(dto: IValidateSearchConfigurationDto): Promise<ValidateSearchConfigurationResponseDto> {
        const { searchQuery, searchConfig, baseUrl } = dto;
        const requestOptions = await this.prepareRequestOptions(baseUrl, searchQuery, searchConfig);
        if (requestOptions?.error) {
            const errRes = new ValidateSearchConfigurationResponseDto({ status: 'error', error: requestOptions.error });
            return errRes;
        }

        try {
            const searchResults = await this.getSearchResults({
                baseUrl,
                searchQuery,
                searchConfig,
                requestOptions: requestOptions.data,
            });

            if (searchResults?.error) {
                const errRes = new ValidateSearchConfigurationResponseDto({ status: 'error', error: searchResults.error });
                return errRes;
            }

            const successRes = new ValidateSearchConfigurationResponseDto({
                status: 'success',
                resultCount: searchResults.discoveredProducts?.length || 0,
                sampleResults: (searchResults.discoveredProducts || []).slice(0, 5),
            });
            return successRes;
        } catch (error) {
            this.logger.error(`Error validate search configuration: ${error?.message}`);
            const errRes = new ValidateSearchConfigurationResponseDto({ status: 'error', error: error?.message || 'Unknown error' });
            return errRes;
        }
    }

    async getSearchResults(dto: IGetSearchResultsDto): Promise<ExtractSearchResultsResponse> {
        const { baseUrl, requestOptions, searchConfig, htmlContentString } = dto;
        let html = htmlContentString;

        if (!html) {
            const htmlContent = await this.scraperService.getHtmlContent(requestOptions.url, searchConfig as any);
            if (htmlContent.status !== 'success') {
                if (htmlContent?.error_code === '404' || htmlContent?.error_code === '400') {
                    const emptyRes = new ExtractSearchResultsResponse({ html: '', discoveredProducts: [] });
                    return emptyRes;
                }
                const errRes = new ExtractSearchResultsResponse({ error: htmlContent.error_message || `Failed to get search results` });
                return errRes;
            }
            html = htmlContent.html;
        }

        try {
            const discoveredProducts = await this.extractDataHelper.runFunctionSearchData({
                htmlContent: html,
                functionGenerator: searchConfig.functionGenerator,
                isGetParentElement: searchConfig.isGetParentElement,
                mainContentSelector: searchConfig.mainContentSelector,
            });

            const filteredResults = await this.filterSearchResults({ ...dto, baseUrl, discoveredProducts: discoveredProducts || [] });

            for (const item of filteredResults) {
                if (item?.imageUrl && !(item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://'))) {
                    item.imageUrl = this.normalizeUrl(item.imageUrl, baseUrl);
                }
                if (item?.url && !(item.url.startsWith('http://') || item.url.startsWith('https://'))) {
                    item.url = this.normalizeUrl(item.url, baseUrl);
                }
            }

            const res = new ExtractSearchResultsResponse({ html, discoveredProducts: filteredResults });
            return res;
        } catch (error) {
            this.logger.error(`Error get search results: ${error?.message}`);
            const errRes = new ExtractSearchResultsResponse({ html, error: error?.message || 'Unknown error' });
            return errRes;
        }
    }

    async prepareRequestOptions(url: string, searchQuery: string, searchConfig: ISearchConfig): Promise<IPrepareRequestOptionsResponse> {
        const searchUrl = this.buildSearchUrl(searchConfig, searchQuery, url);
        const requestOptions: IScraperRequest = {
            url: searchUrl,
            use_browser: searchConfig.useBrowser,
        };
        const res: IPrepareRequestOptionsResponse = { data: requestOptions };
        return res;
    }

    async filterSearchResults(dto: IFilterSearchResultsDto): Promise<DiscoveredProductDto[]> {
        const { discoveredProducts } = dto;
        const maxResults = dto.options?.maxResults || dto.searchConfig?.maxResults || 20;
        const res = discoveredProducts.slice(0, maxResults);
        return res;
    }

    private buildSearchUrl(searchConfig: ISearchConfig, searchQuery: string, baseUrl: string): string {
        const pattern = searchConfig.searchUrlPattern || '/search?q={query}';
        const placeholder = searchConfig.queryPlaceholder || '{query}';
        const encodedQuery = encodeURIComponent(searchQuery);
        const relativeUrl = pattern.replace(placeholder, encodedQuery);
        const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl.replace(/\/$/, '')}/${relativeUrl.replace(/^\//, '')}`;
        return fullUrl;
    }

    private normalizeUrl(url: string, baseUrl: string): string {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const cleanUrl = url.replace(/^\//, '');
        return `${cleanBaseUrl}/${cleanUrl}`;
    }
}
