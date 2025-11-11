import { Browser, BrowserContext, Page } from 'puppeteer';

export interface IPuppeteerOptions {
    args?: string[];
    slowMo?: number;
    dumpio?: boolean;
    headless?: boolean;
    devtools?: boolean;
}

export interface IPuppeteerSession {
    page: Page;
    browser: Browser;
    context: BrowserContext;
    wsEndpoint?: string;
}
