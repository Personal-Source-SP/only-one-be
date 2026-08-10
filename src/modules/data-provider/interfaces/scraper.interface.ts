export interface IScraperRequest {
    url: string;
    use_browser?: boolean;
    waitForSelector?: string;
    cookies?: string;
    headers?: Record<string, string>;
    [key: string]: any;
}

export interface IScraperResponse {
    status: 'success' | 'error';

    html?: string;
    data?: Record<string, any>;

    url?: string;
    title?: string;
    execution_time?: number;

    error_code?: string;
    error_message?: string;
}
