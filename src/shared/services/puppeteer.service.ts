import { Injectable, NotFoundException } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';
import { IPuppeteerOptions } from './../interfaces/index';

@Injectable()
export class PuppeteerService {
    private browserSessions: Map<string, Browser> = new Map();

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
                ],
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

        throw new NotFoundException('browser_session_not_found');
    }
}
