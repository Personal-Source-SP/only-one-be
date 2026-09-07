import { ISearchExtractDataResponse, ISearchTargetConfig } from './target-config.interface';

export interface IGetExtractSearchDataRequest {
    url: string;
    targetConfig: ISearchTargetConfig;
    htmlContentString?: string;
    dataContent?: Record<string, any>;
}

export interface IDataProviderSearchService {
    getExtractSearchData(request: IGetExtractSearchDataRequest): Promise<ISearchExtractDataResponse>;
}
