import { Injectable, NotFoundException } from '@nestjs/common';
import { type BrowserContext, type ElementHandle, type Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../../../shared/services/logger.service';
import { PuppeteerService } from '../../../shared/services/puppeteer.service';
import { SimulateUnlucidAiRequest } from '../dtos/requests/simulate-unlucid-ai.request';
import { SimulateResponse } from '../dtos/responses/simulate.response';
import { PageSite } from '../enums/page-site.enum';
import { SimulationActionType } from '../enums/simulation-action.enum';
import {
    type ClickByTextActionRequest,
    type GoToActionRequest,
    type SimulationActionRequest,
    type SimulationActionResult,
    type WaitForFunctionActionRequest,
    type WaitForNavigationActionRequest,
    type WaitForSelectorActionRequest,
    type WaitForTimeActionRequest,
} from '../interfaces';

@Injectable()
export class SimulationExecutionService {
    private readonly loggerService: LoggerService = new LoggerService(SimulationExecutionService.name);

    constructor(private readonly puppeteerService: PuppeteerService) {}

    async simulateUnlucidAI(request: SimulateUnlucidAiRequest): Promise<SimulateResponse<boolean>> {
        const pageId = uuidv4();
        const page: Page = await this.getCurrentPage(pageId);

        try {
            const initialActions: SimulationActionRequest[] = [
                {
                    page,
                    type: SimulationActionType.GO_TO,
                    url: PageSite.UNLUCID_AI,
                    options: { waitUntil: 'networkidle2' },
                },
                {
                    page,
                    selector: 'button[data-button-root] span',
                    type: SimulationActionType.WAIT_FOR_SELECTOR,
                },
                {
                    isExactMatch: true,
                    matchText: 'Sign In',
                    page,
                    selector: 'button[data-button-root]',
                    type: SimulationActionType.CLICK_BY_TEXT,
                },
                {
                    options: { timeout: 10000 },
                    page,
                    selector: 'button[data-button-root] svg[role="img"]',
                    type: SimulationActionType.WAIT_FOR_SELECTOR,
                },
                {
                    matchText: 'Google',
                    page,
                    selector: 'button[data-button-root]',
                    type: SimulationActionType.CLICK_BY_TEXT,
                },
                {
                    options: { timeout: 15000 },
                    page,
                    type: SimulationActionType.WAIT_FOR_NAVIGATION,
                },
            ];

            const initialResults = await this.executeSimulationActions(initialActions);

            const clicked = initialResults[2]?.isSuccess ?? false;
            const googleClicked = initialResults[4]?.isSuccess ?? false;

            this.loggerService.info('Email filled. Waiting for user to complete Google login (up to 10 minutes)...');
            const waitResults = await this.executeSimulationActions([
                {
                    fn: () => window.location.href.includes('unlucid.ai') || document.querySelector('button[data-button-root]') !== null,
                    options: { timeout: 10 * 60 * 1000 },
                    page,
                    type: SimulationActionType.WAIT_FOR_FUNCTION,
                },
            ]);
            const isRedirectedBack = waitResults[0]?.isSuccess ?? false;

            // Check if we're redirected back to the original site or if there are additional steps
            const currentUrl = page.url();
            this.loggerService.info(`Final URL after login: ${currentUrl}`);

            // Check if login was successful by looking for success indicators
            const isLoginSuccessful = currentUrl.includes('unlucid.ai') || (await page.$('button[data-button-root]')) !== null;

            return {
                isSuccess: clicked && googleClicked && isRedirectedBack && isLoginSuccessful,
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

    private async executeSimulationActions(actions: SimulationActionRequest[]): Promise<SimulationActionResult[]> {
        const results: SimulationActionResult[] = [];

        for (const [index, action] of actions.entries()) {
            let isSuccess = false;
            const actionType = action.type;

            try {
                switch (actionType) {
                    case SimulationActionType.GO_TO:
                        await this.handleGoToAction(action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.CLICK_BY_TEXT:
                        isSuccess = await this.handleClickByTextAction(action);
                        break;
                    case SimulationActionType.WAIT_FOR_SELECTOR:
                        await this.handleWaitForSelectorAction(action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_NAVIGATION:
                        await this.handleWaitForNavigationAction(action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_FUNCTION:
                        await this.handleWaitForFunctionAction(action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_TIME:
                        await this.handleWaitForTimeAction(action);
                        isSuccess = true;
                        break;
                    default:
                        this.loggerService.error(`[${actionType}] unsupported action type`);
                }
            } catch (error) {
                this.loggerService.error(`[${actionType}] execution failed: ${error?.message}`);
            } finally {
                results.push({
                    index,
                    isSuccess,
                    type: actionType,
                });
            }
        }

        return results;
    }

    private async handleGoToAction(request: GoToActionRequest): Promise<void> {
        try {
            await request.page.goto(request.url, request.options);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForSelectorAction(request: WaitForSelectorActionRequest): Promise<void> {
        try {
            await request.page.waitForSelector(request.selector, request.options);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed on selector ${request.selector}: ${error?.message}`);
            throw error;
        }
    }

    private async handleClickByTextAction(request: ClickByTextActionRequest): Promise<boolean> {
        try {
            if (request.waitOptions) {
                await request.page.waitForSelector(request.selector, request.waitOptions);
            }
            const elements: ElementHandle<Element>[] = await request.page.$$(request.selector);

            for (const element of elements) {
                const text = await request.page.evaluate((el) => el.textContent?.trim(), element);
                if (!text) {
                    continue;
                }

                const match = request.isExactMatch ? text === request.matchText : text.includes(request.matchText);
                if (match) {
                    await element.click();
                    return true;
                }
            }

            return false;
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed on selector ${request.selector}: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForNavigationAction(request: WaitForNavigationActionRequest): Promise<void> {
        try {
            await request.page.waitForNavigation(request.options);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForFunctionAction(request: WaitForFunctionActionRequest): Promise<void> {
        try {
            await request.page.waitForFunction(request.fn, request.options);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForTimeAction(request: WaitForTimeActionRequest): Promise<void> {
        try {
            const durationInSeconds = Math.max(request.durationInSeconds, 0);
            await new Promise((resolve) => setTimeout(resolve, durationInSeconds * 1000));
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
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
