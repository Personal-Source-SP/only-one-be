import { Injectable, NotFoundException } from '@nestjs/common';
import { type BrowserContext, type Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../../../shared/services/logger.service';
import { PuppeteerService } from '../../../shared/services/puppeteer.service';
import { SimulateUnlucidAiRequest } from '../dtos/requests/simulate-unlucid-ai.request';
import { SimulateResponse } from '../dtos/responses/simulate.response';
import { PageSite } from '../enums/page-site.enum';

@Injectable()
export class SimulationExecutionService {
    private readonly loggerService: LoggerService = new LoggerService(SimulationExecutionService.name);

    constructor(private readonly puppeteerService: PuppeteerService) {}

    async simulateUnlucidAI(request: SimulateUnlucidAiRequest): Promise<SimulateResponse<boolean>> {
        const pageId = uuidv4();
        const page: Page = await this.getCurrentPage(pageId);

        try {
            await page.goto(PageSite.UNLUCID_AI, { waitUntil: 'networkidle2' });

            // Click the "Sign In" button with the given selector
            await page.waitForSelector('button[data-button-root] span');
            const buttons = await page.$$('button[data-button-root]');
            let clicked = false;

            for (const btn of buttons) {
                const span = await btn.$('span');
                if (span) {
                    const text = await page.evaluate((el) => el.textContent?.trim(), span);
                    if (text === 'Sign In') {
                        this.loggerService.info(`Click sign in button`);
                        await btn.click();
                        this.loggerService.info(`Click sign in button success`);
                        clicked = true;
                        break;
                    }
                }
            }

            // Click the "Google Sign In" button
            await page.waitForSelector('button[data-button-root] svg[role="img"]');
            const googleButtons = await page.$$('button[data-button-root]');
            let googleClicked = false;

            for (const btn of googleButtons) {
                const svg = await btn.$('svg[role="img"]');
                if (svg) {
                    const text = await page.evaluate((el) => el.textContent?.trim(), btn);
                    if (text && text.includes('Google')) {
                        this.loggerService.info(`Click google button`);
                        await btn.click();
                        this.loggerService.info(`Click google button success`);
                        googleClicked = true;
                        break;
                    }
                }
            }

            // Wait for navigation go to google login page
            await page.waitForNavigation({ timeout: 15000 });

            // Inform and wait for user to complete the login manually
            this.loggerService.info('Email filled. Waiting for user to complete Google login (up to 10 minutes)...');
            // Wait until redirected back to unlucid.ai or app UI appears
            await page.waitForFunction(
                () => window.location.href.includes('unlucid.ai') || document.querySelector('button[data-button-root]') !== null,
                { timeout: 10 * 60 * 1000 },
            );

            // Check if we're redirected back to the original site or if there are additional steps
            const currentUrl = page.url();
            this.loggerService.info(`Final URL after login: ${currentUrl}`);

            // Check if login was successful by looking for success indicators
            const isLoginSuccessful = currentUrl.includes('unlucid.ai') || (await page.$('button[data-button-root]')) !== null;

            return {
                isSuccess: clicked && googleClicked && isLoginSuccessful,
            };
        } catch (error) {
            this.loggerService.error(`Simulate Unlucid AI failed: ${error?.message}`);
            this.loggerService.error(`Error stack: ${error?.stack}`);

            return {
                isSuccess: false,
            };
        } finally {
            await this.closeBrowser(pageId, page);
        }
    }

    private async getCurrentPage(pageId: string): Promise<Page> {
        try {
            const browser = await this.puppeteerService.getBrowserSession(pageId);

            const contexts = browser.browserContexts();
            const incognitoContext = contexts.find((c: BrowserContext) => !c.off);

            let context: BrowserContext;
            if (!incognitoContext) {
                context = await browser.createBrowserContext();
            } else {
                context = incognitoContext;
            }

            const pages: Page[] = await context.pages();
            let page: Page;

            if (pages.length > 0) {
                page = pages[0];
            } else {
                page = await context.newPage();
            }

            // Set realistic user agent and viewport
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            );
            await page.setViewport({ width: 1366, height: 768 });

            // Remove automation indicators and add stealth measures
            await page.evaluateOnNewDocument(() => {
                // Remove webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });

                // Remove automation indicators
                delete (window as any).chrome;
                delete (window as any).navigator.webdriver;
                delete (window as any).navigator.__webdriver_script_fn;
                delete (window as any).navigator.__webdriver_evaluate;
                delete (window as any).navigator.__webdriver_unwrapped;
                delete (window as any).navigator.__fxdriver_evaluate;
                delete (window as any).navigator.__driver_unwrapped;
                delete (window as any).navigator.__webdriver_script_func;
                delete (window as any).navigator.__webdriver_script_function;

                // Override plugins to look realistic
                Object.defineProperty(navigator, 'plugins', {
                    get: () => {
                        return [
                            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                            { name: 'Native Client', filename: 'internal-nacl-plugin' },
                        ];
                    },
                });

                // Override languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });

                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => {
                    if (parameters.name === 'notifications') {
                        return Promise.resolve({
                            state: Notification.permission,
                            name: 'notifications',
                            onchange: null,
                            addEventListener: () => {},
                            removeEventListener: () => {},
                            dispatchEvent: () => false,
                        } as PermissionStatus);
                    }
                    return originalQuery(parameters);
                };

                // Override getBattery
                Object.defineProperty(navigator, 'getBattery', {
                    get: () => () =>
                        Promise.resolve({
                            charging: true,
                            chargingTime: 0,
                            dischargingTime: Infinity,
                            level: 1,
                        }),
                });

                // Override connection
                Object.defineProperty(navigator, 'connection', {
                    get: () => ({
                        effectiveType: '4g',
                        rtt: 50,
                        downlink: 10,
                    }),
                });

                // Add realistic screen properties
                Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
                Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
                Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
                Object.defineProperty(screen, 'height', { get: () => 1080 });
                Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
                Object.defineProperty(screen, 'width', { get: () => 1920 });
            });

            return page;
        } catch (error) {
            this.loggerService.error(`Get current page failed: ${error?.message}`);
            throw new NotFoundException('Get current page failed');
        }
    }

    private async closeBrowser(pageId: string, page: Page): Promise<void> {
        try {
            const browser = await this.puppeteerService.getBrowserSession(pageId);
            await new Promise((r) => setTimeout(r, 1000));

            await page.close();
            await new Promise((r) => setTimeout(r, 500));

            await browser.close();
            await this.puppeteerService.closePageSession(pageId);
        } catch (error) {
            this.loggerService.error(`Close browser failed: ${error?.message}`);
            throw new NotFoundException('Close browser failed');
        }
    }
}
