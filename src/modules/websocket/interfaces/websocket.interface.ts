export interface WebSocketMessage<T = any> {
    data: T;
    event: string;
    timestamp: number;
    clientId?: string;
}

export interface WebSocketResponse<T = any> {
    timestamp: number;
    status: 'success' | 'error';
    data?: T;
    message?: string;
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

export interface IJobProgressData {
    jobId: string;
    jobName: string;
    progress: number;
    status: 'pending' | 'active' | 'completed' | 'failed';
    data?: any;
    error?: string;
    timestamp: number;
}

export interface INotificationSocketData {
    id: string;
    userId: string;
    title: string;
    content: string;
    type?: string;
    metadata?: any;
    createdAt?: Date | string;
}
