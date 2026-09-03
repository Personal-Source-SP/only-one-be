export interface IDiscoveryFetchHtmlResult {
    html: string;
    title?: string;
}

export interface IDiscoveryCrawlQueueItem {
    url: string;
    depth: number;
}

export interface IDiscoveryExtractedItem {
    url: string;
    title?: string;
    description?: string;
}
