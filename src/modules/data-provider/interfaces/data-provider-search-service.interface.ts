import {
    DiscoveredProductDto,
    ExtractSearchResultsResponse,
    SearchProductsResponseDto,
    ValidateSearchConfigurationResponseDto,
} from '../dtos/responses/search-products-response.dto';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { IScraperRequest } from './scraper.interface';
import { ISearchConfig, SearchOptions } from './search-config.interface';

export interface ISearchProductsDto {
    searchQuery: string;
    dataProvider: DataProviderEntity;
    options?: SearchOptions;
    barcode?: string;
}

export interface IValidateSearchConfigurationDto {
    baseUrl: string;
    searchQuery: string;
    searchConfig: ISearchConfig;
}

export interface IGetSearchResultsDto {
    baseUrl: string;
    searchQuery: string;
    searchConfig: ISearchConfig;
    options?: SearchOptions;
    htmlContentString?: string;
    requestOptions?: IScraperRequest;
}

export interface IPrepareRequestOptionsResponse {
    error?: string;
    data?: IScraperRequest;
}

export interface IFilterSearchResultsDto {
    baseUrl: string;
    searchQuery: string;
    searchConfig: ISearchConfig;
    discoveredProducts: DiscoveredProductDto[];
    options?: SearchOptions;
}

export interface IDataProviderSearchService {
    searchProducts(dto: ISearchProductsDto): Promise<SearchProductsResponseDto>;
    validateSearchConfiguration(dto: IValidateSearchConfigurationDto): Promise<ValidateSearchConfigurationResponseDto>;
    getSearchResults(dto: IGetSearchResultsDto): Promise<ExtractSearchResultsResponse>;
    prepareRequestOptions(url: string, searchQuery: string, searchConfig: ISearchConfig): Promise<IPrepareRequestOptionsResponse>;
    filterSearchResults(dto: IFilterSearchResultsDto): Promise<DiscoveredProductDto[]>;
}
