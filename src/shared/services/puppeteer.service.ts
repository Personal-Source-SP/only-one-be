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

    async closePageSession(pageId: string) {
        if (this.browserSessions.has(pageId)) {
            await this.browserSessions.get(pageId)!.close();
            this.browserSessions.delete(pageId);
        }

        throw new NotFoundException('browser_session_not_found');
    }
}
