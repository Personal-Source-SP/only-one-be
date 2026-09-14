export interface IRunSearchFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    resultSelector?: string;
    maxResults?: number;
    mainContentSelector?: string;
    isGetParentElement?: boolean;
}

export interface IRunApiSearchFunctionExtractData {
    functionGenerator: string;
    data: Record<string, unknown>;
    maxResults?: number;
}

export interface ISearchResultItem {
    url: string;
    code?: string;
    title?: string;
    imageUrl?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    [key: string]: any;
}

export interface ISearchExtractDataResponse {
    html?: string;
    error?: string;
    data?: ISearchResultItem[];
}
