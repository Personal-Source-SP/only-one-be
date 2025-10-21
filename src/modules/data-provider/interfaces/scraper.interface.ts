export interface IScraperRequest {
    url: string;
    proxy?: string;
    timeout?: number;
    full_page?: boolean;
    screenshot?: boolean;
    use_browser?: boolean;
    main_selector?: string;
    disable_cache?: boolean;
    cookies?: string;
    headers?: Record<string, string>;
    cookie_consent_selector?: string;
    wait_for_element?: string;
}

export interface IScraperResponse {
    status: 'success' | 'error';
    html?: string;
    error_code?: string;
    from_cache?: boolean;
    error_message?: string;
    execution_time?: number;
}

export interface IScraperScreenshotResponse {
    status: 'success' | 'error';
    image?: string;
    mimetype?: string;
    from_cache?: boolean;
    execution_time?: number;
    error_code?: string;
    error_message?: string;
}
