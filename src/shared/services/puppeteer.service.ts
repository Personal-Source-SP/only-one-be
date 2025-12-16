import { Injectable } from '@nestjs/common';
import puppeteer, { type Browser, type BrowserContext, type Page } from 'puppeteer';
import { IPuppeteerOptions, IPuppeteerSession } from './../interfaces/index';
import { LoggerService } from './logger.service';

@Injectable()
export class PuppeteerService {
    private browserSessions: Map<string, Browser> = new Map();
    private readonly loggerService: LoggerService = new LoggerService(PuppeteerService.name);

    getBrowserSessions(): Map<string, Browser> {
        return this.browserSessions;
    }

    getWsEndpoint(browser: Browser): string | undefined {
        try {
            if (!browser?.isConnected?.()) {
                this.loggerService.error('Browser is not connected. Cannot retrieve wsEndpoint.');
                return undefined;
            }

            const maybe = (browser as any).wsEndpoint;
            if (typeof maybe !== 'function') {
                this.loggerService.error('Browser wsEndpoint is not a function.');
                return undefined;
            }

            return maybe.call(browser);
        } catch (error) {
            this.loggerService.error(`Failed to get wsEndpoint: ${error?.message}`);
            return undefined;
        }
    }

    async getBrowserSession(pageId: string, options?: IPuppeteerOptions): Promise<Browser> {
        if (!this.browserSessions.has(pageId)) {
            const browser: Browser = await puppeteer.launch({
                headless: options?.headless ?? false,
                slowMo: options?.slowMo ?? 50,
                dumpio: options?.dumpio ?? true,
                devtools: options?.devtools ?? false,
                args: options?.args ?? [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--disable-site-isolation-trials',
                    '--disable-web-security',
                    '--disable-features=site-per-process',
                    '--window-position=0,0',
                    '--disable-gpu',
                    '--ignore-certifcate-errors',
                    '--ignore-certifcate-errors-spki-list',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-hang-monitor',
                    '--disable-prompt-on-repost',
                    '--disable-domain-reliability',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--mute-audio',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-logging',
                    '--disable-gpu-logging',
                    '--silent',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ],
            });

            this.browserSessions.set(pageId, browser);
        }

        return this.browserSessions.get(pageId)!;
    }

    async closePageSession(pageId: string): Promise<boolean> {
        const browser = this.browserSessions.get(pageId);
        if (!browser) {
            this.loggerService.error(`Browser session not found for page id ${pageId}`);
            return false;
        }

        this.browserSessions.delete(pageId);

        try {
            if (browser.isConnected()) {
                await browser.close();
            }
        } catch (error) {
            this.loggerService.error(`Failed to close browser session ${pageId}: ${error?.message}`);
            throw error;
        }

        return true;
    }

    async ensureSessionAndPage(pageId: string): Promise<IPuppeteerSession> {
        const browser = await this.getBrowserSession(pageId);

        const contexts = browser.browserContexts();
        const incognitoContext = contexts.find((c: BrowserContext) => !c.off);
        const context = incognitoContext ?? (await browser.createBrowserContext());

        const pages = await context.pages();
        const page: Page = pages.length > 0 ? pages[0] : await context.newPage();

        await page.setViewport({ width: 1920, height: 1080 });

        const wsEndpoint = this.getWsEndpoint(browser);

        return { browser, context, page, wsEndpoint };
    }
}
