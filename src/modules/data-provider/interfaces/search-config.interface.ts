export interface ISearchConfig {
    // Search URL Configuration
    searchUrlPattern: string; // e.g., "/search?q={query}&category=all"
    queryPlaceholder: string; // e.g., "{query}" in the URL pattern (default: "{query}")

    // Search Result Parsing Configuration
    mainContentSelector: string; // CSS selector for individual product items within mainContentSelector
    resultSelector: string; // CSS selector for individual product items within resultSelector

    // Limits (first page only)
    maxResults: number; // Maximum number of results to parse from first page (default: 20)

    // Request Configuration
    useBrowser: boolean; // Using config use_browser in scraper service
    functionGenerator: string; // Function generator
    isGetParentElement: boolean; // Get parent element of main content
    useProxy?: boolean; // Use proxy for scraping
    proxyCountries?: string[]; // List of countries to select proxies from
    proxyProviders?: string[]; // List of specific proxy providers to use
    waitForElement?: string; // Wait for element to be visible
    enableBarcodeSearch?: boolean; // Enable barcode search instead of product name
}

export interface SearchOptions {
    maxResults?: number;
    confidenceScore?: number;
    filterByRelevance?: boolean;
}

export interface IGenerateSearchFunction {
    htmlContent: string;
    resultSelector: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
}

export interface IRunFunctionSearchData {
    htmlContent: string;
    functionGenerator: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
}
