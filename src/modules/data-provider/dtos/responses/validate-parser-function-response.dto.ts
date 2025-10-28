import { ScrapeItemDataResponseItemDto } from './scrape-item-data-response.dto';

export class ValidateParserFunctionResponseDto {
    status: 'success' | 'error';
    data?: ScrapeItemDataResponseItemDto[];
    error?: string;

    constructor(data?: Partial<ValidateParserFunctionResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
