import { IScraperRequest } from '../../interfaces';

export class ScrapeItemDataResponseDto {
    itemUrl: string;
    dataProviderId: string;
    status: 'success' | 'error';
    dataProviderItemId: string;

    // Html extraction
    html?: string;

    // Vision extraction
    image?: string;

    // Error
    error?: string;

    // Item data
    itemData?: string;
    extractedDataResult?: Record<string, any>;

    // Request
    request?: IScraperRequest;

    constructor(data?: Partial<ScrapeItemDataResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
