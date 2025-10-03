export interface WebSocketMessage<T = any> {
    event: string;
    data: T;
    timestamp: number;
    clientId?: string;
}

export interface WebSocketResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    timestamp: number;
}

export interface ScoutRequestProcessingData {
    requestId: string;
    productName: string;
    countryCode: string;
    status: 'processing' | 'completed' | 'failed';
    progress?: number;
    results?: any[];
    error?: string;
}

export interface WebSocketConfig {
    port?: number;
    path?: string;
    namespace?: string;
    cors?: {
        origin: string | string[];
        credentials?: boolean;
    };
    transports?: string[];
}

export interface PriceMatrixData {
    dataProviderProductId: string;
    dataProviderId?: string;
    dataProviderName?: string;
    country?: string;
    priceHistories?: any[];
    convertPriceHistories?: any[];
    productUrl?: string;
    lastScrapeStatus: string;
    lastScrapedTimestamp?: Date;
}
