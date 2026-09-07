export class SearchResultItemDto {
    url: string;
    title?: string;
    imageUrl?: string;
    relativeUrl?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
}

export class SearchExtractDataResponseDto {
    html?: string;
    error?: string;
    data?: SearchResultItemDto[];

    constructor(partial?: Partial<SearchExtractDataResponseDto>) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
}
