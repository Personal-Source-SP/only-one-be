export interface ITargetConfig {
    useBrowser: boolean; // Using config use_browser in scraper service
    functionGenerator: string; // Function generator
    mainContentSelector: string; // Main selector for getting main content
    isGetParentElement: boolean; // Get parent element of main content
    useProxy?: boolean; // Use proxy for scraping
    proxyCountries?: string[]; // List of countries to select proxies from
    proxyProviders?: string[]; // List of specific proxy providers to use
    useVisionExtraction?: boolean; // Use vision extraction for scraping
    visionMainSelector?: string; // Main selector for vision extraction
    cookieConsentSelector?: string; // CSS selector for cookie consent element to hide
    waitForElement?: string; // Wait for element to be visible
}

export interface IGenerateExtractDataFunction {
    htmlContent: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
    additionalHtmlContent?: string[]; // Optional array of additional HTML content examples
}

export interface IRunFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
}

export interface IParseExtractDataOpenRouter {
    screenshots: string;
    type: 'screenshots';
}
