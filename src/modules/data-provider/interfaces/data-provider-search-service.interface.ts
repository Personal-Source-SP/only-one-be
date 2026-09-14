import { ISearchExtractDataResponse, ISearchTargetConfig } from './search-feature.interface';

export interface IGetExtractSearchDataRequest {
    url: string;
    targetConfig: ISearchTargetConfig;
    htmlContentString?: string;
    dataContent?: Record<string, unknown>;
}

export interface IDataProviderSearchService {
    getExtractSearchData(request: IGetExtractSearchDataRequest): Promise<ISearchExtractDataResponse>;
}
