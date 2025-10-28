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
