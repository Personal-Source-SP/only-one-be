import { ScrapeItemDataResponseItemDto } from './scrape-item-data-response.dto';

export class ProcessScrapeDataProviderResponse {
    success: number;
    error: number;

    successData?: {
        itemId: string;
        dataProviderId: string;
        dataProviderName: string;
        dataProviderItemId: string;
        dataProviderItemUrl: string;

        url: string;
        dataId: string;
        mimeType: string;
        data: Record<string, any>;
        lastModified?: Date;
    }[];

    errors?: {
        errorMessage: string;
        dataProviderName: string;
        dataProviderItemUrl?: string;
    }[];

    constructor(data?: Partial<ProcessScrapeDataProviderResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class ProcessScrapeDataResponse {
    process: number;
    success: number;
    error: number;

    errorsMessage?: string;

    successData?: {
        itemId: string;
        dataProviderId: string;
        dataProviderName: string;
        dataProviderItemId: string;
        dataProviderItemUrl: string;

        url: string;
        dataId: string;
        mimeType: string;
        data: Record<string, any>;
        lastModified?: Date;
    }[];

    errors?: {
        errorMessage: string;
        dataProviderName: string;
        dataProviderItemUrl?: string;
    }[];

    constructor(data?: Partial<ProcessScrapeDataResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class ProcessDataProviderItemResponse {
    status: 'success' | 'error';
    data?: ScrapeItemDataResponseItemDto[];
    errorMessage?: string;

    constructor(data?: Partial<ProcessDataProviderItemResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
