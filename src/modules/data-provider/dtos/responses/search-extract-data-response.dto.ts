export class SearchResultItemDto {
    url: string;
    code?: string;
    title?: string;
    imageUrl?: string;
    tags?: string[];
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
