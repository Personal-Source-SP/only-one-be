export enum DataProviderStatus {
    READY = 'ready', //  Provider is fully configured and operational for scraping
    TESTING = 'testing', // Provider is in test mode (e.g., limited scrape jobs for validation)
    UNCONFIGURED = 'unconfigured', // Critical configuration is missing (e.g., scrapeInterval, scrapeTier)
    ERROR = 'error', // Provider has encountered an error and is not operational
}
