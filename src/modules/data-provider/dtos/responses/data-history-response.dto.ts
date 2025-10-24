export class ProcessScrapeDataResponse {
    process: number;
    success: number;
    error: number;

    errorsMessage?: string;

    successData?: {
        dataProviderId: string;
        dataProviderItemId: string;
        data: Record<string, any>;

        type?: string;
        url?: string;
        lastModified?: Date;
    }[];

    errors?: {
        dataProviderId: string;
        errorMessage: string;
        dataProviderItemId?: string;
    }[];

    constructor(data?: Partial<ProcessScrapeDataResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class ProcessDataProviderItemResponse {
    status: 'success' | 'error';
    data?: Record<string, any>;
    errorMessage?: string;

    constructor(data?: Partial<ProcessDataProviderItemResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
