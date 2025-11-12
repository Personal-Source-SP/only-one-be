import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { BaseHttpService } from './../../../shared/services/base-http.service';

import { AxiosRequestConfig } from 'axios';
import { LoggerService } from '../../../shared/services/logger.service';
import { IScraperResponse } from '../interfaces/scraper.interface';
import { ITargetConfig } from '../interfaces/target-config.interface';

@Injectable()
export class ScraperService implements OnModuleDestroy {
    private browser: Browser | null = null;

    private readonly loggerService: LoggerService = new LoggerService(ScraperService.name);

    constructor(private readonly baseHttpService: BaseHttpService) {
        puppeteer.use(StealthPlugin());
        puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
    }

    async onModuleDestroy(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async getHtmlContent(url: string, targetConfig: ITargetConfig): Promise<IScraperResponse> {
        const {
            retryAttempts = 3,
            retryDelay = 2000,
            timeout = 30000,
            waitForTimeout = 10000,
            waitForSelector,
            stealthMode,
            cloudflareBypass,
        } = this.transformTargetConfig(targetConfig);

        const startTime = Date.now();

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            let page: Page | null = null;

            try {
                const browser = await this.getBrowser(stealthMode);
                page = await browser.newPage();

                await this.configurePage(page, targetConfig);

                if (cloudflareBypass) {
                    await this.handleCloudflare(page, targetConfig);
                }

                await page.goto(url, {
                    timeout,
                    waitUntil: 'networkidle2',
                });

                if (waitForSelector) {
                    await page.waitForSelector(waitForSelector, {
                        timeout: waitForTimeout,
                    });
                }

                const html = await page.content();
                const title = await page.title();
                const currentUrl = page.url();

                return {
                    status: 'success',
                    html,
                    title,
                    url: currentUrl,
                    execution_time: Date.now() - startTime,
                };
            } catch (error) {
                this.loggerService.error(`Get html content attempt ${attempt} failed: ${error?.message}`);

                if (attempt === retryAttempts) {
                    return {
                        status: 'error',
                        error_code: error?.name || 'UNKNOWN_ERROR',
                        error_message: error?.message || 'Unknown error',
                        execution_time: Date.now() - startTime,
                    };
                }

                if (page) {
                    await page.close();
                }

                if (attempt < retryAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                }
            }
        }
    }

    async getApiContent(url: string, targetConfig: ITargetConfig, lastScrapedTimestamp?: Date): Promise<IScraperResponse> {
        const { retryAttempts, retryDelay, timeout, userAgent, headers, cookies, queryParams, firstQueryParams } =
            this.transformTargetConfig(targetConfig);

        const startTime = Date.now();

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                const config: AxiosRequestConfig = {
                    timeout,
                    headers: {
                        'User-Agent':
                            userAgent ||
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        Pragma: 'no-cache',
                        ...headers,
                    },
                };

                if (cookies?.length > 0) {
                    const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
                    config.headers['Cookie'] = cookieString;
                }

                const params = lastScrapedTimestamp ? queryParams : (firstQueryParams ?? queryParams);
                const requestUrl = params ? `${url}${params}` : url;
                const response = await this.baseHttpService.get<Record<string, any>>(requestUrl, config);

                return {
                    status: 'success',
                    data: response.data,
                    execution_time: Date.now() - startTime,
                };
            } catch (error) {
                this.loggerService.error(`Get api content attempt ${attempt} failed: ${error?.message}`);

                if (attempt === retryAttempts) {
                    return {
                        status: 'error',
                        execution_time: Date.now() - startTime,
                        error_code: error?.name || 'UNKNOWN_ERROR',
                        error_message: error?.message || 'Unknown error',
                    };
                }

                if (attempt < retryAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                }
            }
        }
    }

    private transformTargetConfig(targetConfig: ITargetConfig): ITargetConfig {
        return {
            ...targetConfig,
            timeout: targetConfig.timeout || 30000,
            maxResults: targetConfig.maxResults || 30,
            retryDelay: targetConfig.retryDelay || 2000,
            retryAttempts: targetConfig.retryAttempts || 3,
            waitForTimeout: targetConfig.waitForTimeout || 10000,
        };
    }

    private async getBrowser(stealthMode = false): Promise<Browser> {
        if (!this.browser) {
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-field-trial-config',
                '--disable-ipc-flooding-protection',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--disable-sync',
                '--disable-translate',
                '--disable-windows10-custom-titlebar',
                '--disable-client-side-phishing-detection',
                '--disable-component-extensions-with-background-pages',
                '--disable-default-apps',
                '--disable-extensions',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--no-default-browser-check',
                '--no-pings',
                '--password-store=basic',
                '--use-mock-keychain',
                '--disable-blink-features=AutomationControlled',
            ];

            if (stealthMode) {
                args.push(
                    '--disable-blink-features=AutomationControlled',
                    '--exclude-switches=enable-automation',
                    '--disable-extensions-except',
                    '--disable-plugins-discovery',
                    '--disable-default-apps',
                );
            }

            this.browser = await puppeteer.launch({
                headless: stealthMode ? 'shell' : true,
                args,
                ignoreDefaultArgs: stealthMode ? ['--enable-automation'] : [],
            });
        }
        return this.browser;
    }

    private async handleCloudflare(page: Page, targetConfig: ITargetConfig): Promise<void> {
        const { userAgent } = targetConfig;

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            (window as any).chrome = {
                runtime: {} as any,
            };

            Object.defineProperty(navigator, 'permissions', {
                get: () => ({
                    query: () => Promise.resolve({ state: 'granted' }),
                }),
            });
        });

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
        });

        await page.setUserAgent(
            userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );
    }

    private async configurePage(page: Page, targetConfig: ITargetConfig): Promise<void> {
        const { userAgent, headers, cookies, javascriptEnabled, imagesEnabled, cssEnabled } = targetConfig;

        if (userAgent) {
            await page.setUserAgent(userAgent);
        }

        if (headers) {
            await page.setExtraHTTPHeaders(headers);
        }

        if (cookies) {
            await page.setCookie(...cookies);
        }

        if (javascriptEnabled === false) {
            await page.setJavaScriptEnabled(false);
        }

        if (imagesEnabled === false) {
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (req.resourceType() === 'image') {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }

        if (cssEnabled === false) {
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (req.resourceType() === 'stylesheet') {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }
    }
}
