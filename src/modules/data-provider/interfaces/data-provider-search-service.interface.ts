import { ISearchExtractDataResponse, ISearchTargetConfig } from './target-config.interface';

export interface IGetExtractSearchDataRequest {
    url: string;
    targetConfig: ISearchTargetConfig;
    htmlContentString?: string;
    dataContent?: Record<string, unknown>;
}

export interface IDataProviderSearchService {
    getExtractSearchData(request: IGetExtractSearchDataRequest): Promise<ISearchExtractDataResponse>;
}
