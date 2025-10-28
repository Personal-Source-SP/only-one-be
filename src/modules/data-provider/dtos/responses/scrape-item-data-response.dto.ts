import { ITargetConfig } from '../../interfaces';

export class ScrapeItemDataResponseItemDto {
    id: string;
    url: string;
    mimeType?: string;
    lastModified?: Date;
}

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
    extractedDataResult?: Array<ScrapeItemDataResponseItemDto>;

    // Request
    request?: ITargetConfig;

    constructor(data?: Partial<ScrapeItemDataResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
