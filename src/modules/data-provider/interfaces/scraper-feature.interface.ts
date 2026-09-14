export interface IRunScraperFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    mainContentSelector?: string;
    isGetParentElement?: boolean;
}

export interface IRunApiScraperFunctionExtractData {
    functionGenerator: string;
    data: Record<string, unknown>;
}

export interface IScraperResultItem {
    url: string;
    use_browser?: boolean;
    waitForSelector?: string;
    cookies?: string;
    headers?: Record<string, string>;
    [key: string]: any;
}

export interface IScraperExtractDataResponse {
    status: 'success' | 'error';

    html?: string;
    data?: Record<string, any>;

    url?: string;
    title?: string;
    execution_time?: number;

    error_code?: string;
    error_message?: string;
}
