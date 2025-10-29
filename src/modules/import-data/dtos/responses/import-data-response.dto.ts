import { ApiResponseProperty } from '@nestjs/swagger';

export class PreviewImportDataProviderItem {
    @ApiResponseProperty()
    itemName: string;

    @ApiResponseProperty()
    itemCode: string;

    @ApiResponseProperty()
    itemUrl: string;

    @ApiResponseProperty()
    dataProviderIdentifier: string;

    @ApiResponseProperty()
    itemId?: string;

    @ApiResponseProperty()
    dataProviderId?: string;

    @ApiResponseProperty()
    dataProviderName?: string;

    constructor(data?: Partial<PreviewImportDataProviderItem>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class PreviewImportDataResponseDto {
    @ApiResponseProperty()
    statistics?: {
        errors: number;
        updates: number;
        overridden: number;
    };

    @ApiResponseProperty()
    data: any[];

    @ApiResponseProperty()
    errorMessage?: string;

    constructor(data?: Partial<PreviewImportDataResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class ImportDataResponseDto {
    @ApiResponseProperty()
    success: boolean;

    @ApiResponseProperty()
    message: string;

    @ApiResponseProperty()
    updated: number;

    @ApiResponseProperty()
    validationErrorMessages?: string[];

    constructor(data?: Partial<ImportDataResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
