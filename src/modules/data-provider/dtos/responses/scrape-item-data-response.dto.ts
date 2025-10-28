import { ITargetConfig } from '../../interfaces';

export class ScrapeItemDataResponseDto {
    itemUrl: string;
    dataProviderId: string;
    status: 'success' | 'error';
    dataProviderItemId: string;

    // Html extraction
    html?: string;

    // Error
    error?: string;

    // Item data
    extractedDataResult?: Record<string, any>;

    // Request
    request?: ITargetConfig;

    constructor(data?: Partial<ScrapeItemDataResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
