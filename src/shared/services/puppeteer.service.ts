import { Injectable } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';

@Injectable()
export class PuppeteerService {
    private browserSessions: Map<string, Browser> = new Map();

    async getBrowserSession(pageId: string): Promise<Browser> {
        if (!this.browserSessions.has(pageId)) {
            const browser: Browser = await puppeteer.launch({
                headless: true,
                args: [
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
                ],
                devtools: false,
                dumpio: true,
                // slowMo: 10,
                // ignoreHTTPSErrors: true,
            });

            this.browserSessions.set(pageId, browser);
        }

        return this.browserSessions.get(pageId)!;
    }

    async closePageSession(pageId: string) {
        if (this.browserSessions.has(pageId)) {
            await this.browserSessions.get(pageId)!.close();
            this.browserSessions.delete(pageId);
        }
    }
}
