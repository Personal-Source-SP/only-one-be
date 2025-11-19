import { Injectable, NotFoundException } from '@nestjs/common';
import {
    type BrowserContext,
    type ElementHandle,
    type FrameWaitForFunctionOptions,
    type Page,
    type WaitForOptions,
    type WaitForSelectorOptions,
} from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../../../shared/services/logger.service';
import { PuppeteerService } from '../../../shared/services/puppeteer.service';
import { SimulateResponse } from '../dtos/responses/simulate.response';
import { SimulationService } from '../enums';
import { SimulationActionType } from '../enums/simulation-action.enum';
import {
    ServiceExecutionInternalResult,
    type ClickByTextActionRequest,
    type FillInputActionRequest,
    type GoToActionRequest,
    type SelectOptionActionRequest,
    type SimulationActionRequest,
    type SimulationActionResult,
    type SimulationExecuteRequest,
    type SimulationExecutionSummary,
    type WaitForFunctionActionRequest,
    type WaitForNavigationActionRequest,
    type WaitForSelectorActionRequest,
    type WaitForTimeActionRequest,
} from '../interfaces';

@Injectable()
export class SimulationExecutionService {
    private readonly loggerService: LoggerService = new LoggerService(SimulationExecutionService.name);
    private readonly defaultWaitTimeoutInSeconds = 10;
    private readonly defaultElementAppearIntervalInSeconds = 0.5;

    constructor(private readonly puppeteerService: PuppeteerService) {}

    async execute<TPayload>(request: SimulationExecuteRequest<TPayload>): Promise<SimulateResponse<SimulationExecutionSummary>> {
        const pageId = uuidv4();
        const startedAt = new Date();
        const serviceExecution = request?.serviceExecution;

        let isSuccess = false;
        let page: Page | null = null;
        let executionError: Error | null = null;
        let actionResults: SimulationActionResult[] = [];

        try {
            if (!serviceExecution) {
                throw new NotFoundException('Service execution is required');
            }

            page = await this.getCurrentPage(pageId);

            switch (serviceExecution) {
                case SimulationService.UNLUCID_AI: {
                    const executionResult = await this.runUnlucidAi(page);

                    isSuccess = executionResult.isSuccess;
                    actionResults = executionResult.actions;

                    break;
                }

                default: {
                    throw new NotFoundException(`Service execution ${serviceExecution} is not supported`);
                }
            }
        } catch (error) {
            executionError = error as Error;
            this.loggerService.error(`Execute failed for ${serviceExecution}: ${executionError?.message}`);
        } finally {
            if (page) {
                try {
                    await this.closeBrowser(pageId, page);
                } catch (closeError) {
                    this.loggerService.error(`Close browser failed for ${serviceExecution}: ${closeError?.message}`);
                }
            }
        }

        const endedAt = new Date();
        const summary: SimulationExecutionSummary = {
            actions: actionResults,
            endedAt: endedAt.toISOString(),
            startedAt: startedAt.toISOString(),
            durationInMs: endedAt.getTime() - startedAt.getTime(),
            serviceExecution: serviceExecution ?? SimulationService.UNLUCID_AI,
        };

        return {
            isSuccess,
            data: summary,
            errorMessage: executionError ? executionError.message : isSuccess ? undefined : 'Simulation finished with errors',
        };
    }

    private async executeSimulationActions(page: Page, actions: SimulationActionRequest[]): Promise<SimulationActionResult[]> {
        const results: SimulationActionResult[] = [];

        for (const [index, action] of actions.entries()) {
            let isSuccess = false;
            const actionType = action.type;
            const actionStartedAt = Date.now();
            let actionErrorMessage: string | undefined;

            try {
                switch (actionType) {
                    case SimulationActionType.GO_TO:
                        await this.handleGoToAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.CLICK_BY_TEXT:
                        isSuccess = await this.handleClickByTextAction(page, action);
                        break;
                    case SimulationActionType.WAIT_FOR_SELECTOR:
                        await this.handleWaitForSelectorAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_NAVIGATION:
                        await this.handleWaitForNavigationAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_FUNCTION:
                        await this.handleWaitForFunctionAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_TIME:
                        await this.handleWaitForTimeAction(action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.FILL_INPUT:
                        await this.handleFillInputAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.SELECT_OPTION:
                        await this.handleSelectOptionAction(page, action);
                        isSuccess = true;
                        break;
                    default:
                        this.loggerService.error(`[${actionType}] unsupported action type`);
                }
            } catch (error) {
                actionErrorMessage = (error as Error)?.message ?? 'Execution failed';
                this.loggerService.error(`[${actionType}] execution failed: ${actionErrorMessage}`);
            } finally {
                const actionEndedAt = Date.now();

                results.push({
                    index,
                    isSuccess,
                    type: actionType,
                    errorMessage: actionErrorMessage,
                    endedAt: new Date(actionEndedAt).toISOString(),
                    startedAt: new Date(actionStartedAt).toISOString(),
                    durationInMs: actionEndedAt - actionStartedAt,
                });
            }
        }

        return results;
    }

    private async runUnlucidAi(page: Page): Promise<ServiceExecutionInternalResult> {
        const actions: SimulationActionRequest[] = [
            {
                type: SimulationActionType.GO_TO,
                options: {
                    url: 'https://unlucid.ai/r/pmwnjuvt',
                    gotoOptions: { waitUntil: 'networkidle2' },
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_SELECTOR,
                options: {
                    selector: 'button[data-button-root] span',
                },
            },
            {
                type: SimulationActionType.CLICK_BY_TEXT,
                options: {
                    isExactMatch: true,
                    matchText: 'Sign In',
                    selector: 'button[data-button-root]',
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_SELECTOR,
                options: {
                    selector: 'button[data-button-root] svg[role="img"]',
                    waitOptions: { timeout: 10 },
                },
            },
            {
                type: SimulationActionType.CLICK_BY_TEXT,
                options: {
                    matchText: 'Google',
                    selector: 'button[data-button-root]',
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_NAVIGATION,
                options: {
                    waitOptions: { timeout: 15 },
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_SELECTOR,
                options: {
                    selector: 'input[type="email"].whsOnd.zHQkBf#identifierId[name="identifier"]',
                    maxTimeoutInSeconds: 100 * 60,
                    usePolling: true,
                },
            },
            {
                type: SimulationActionType.FILL_INPUT,
                options: {
                    clearBefore: true,
                    value: 'KelliaClementsez382@edub5.us',
                    selector: 'input[type="email"].whsOnd.zHQkBf#identifierId[name="identifier"]',
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_SELECTOR,
                options: {
                    selector: 'input[type="password"].whsOnd.zHQkBf[name="Passwd"]',
                    maxTimeoutInSeconds: 100 * 60,
                    usePolling: true,
                },
            },
            {
                type: SimulationActionType.FILL_INPUT,
                options: {
                    clearBefore: true,
                    value: 'Phat3479',
                    selector: 'input[type="password"].whsOnd.zHQkBf[name="Passwd"]',
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_NAVIGATION,
                options: {
                    waitOptions: { timeout: 15 },
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_SELECTOR,
                options: {
                    selector: 'span.counter',
                    maxTimeoutInSeconds: 100 * 60,
                    usePolling: true,
                },
            },
            {
                type: SimulationActionType.GO_TO,
                options: {
                    url: 'https://unlucid.ai/account',
                    gotoOptions: { waitUntil: 'networkidle2' },
                },
            },
            {
                type: SimulationActionType.CLICK_BY_TEXT,
                options: {
                    selector: 'button',
                    matchText: 'Enable',
                    isExactMatch: true,
                },
            },
            {
                type: SimulationActionType.GO_TO,
                options: {
                    url: 'https://unlucid.ai/effects',
                    gotoOptions: { waitUntil: 'networkidle2' },
                },
            },
            {
                type: SimulationActionType.WAIT_FOR_NAVIGATION,
                options: {
                    waitOptions: { timeout: 60_000 },
                },
            },
        ];

        this.loggerService.info('Email filled. Waiting for user to complete Google login (up to 10 minutes)...');
        const results = await this.executeSimulationActions(page, actions);

        const clicked = results[2]?.isSuccess ?? false;
        const googleClicked = results[4]?.isSuccess ?? false;
        const isRedirectedBack = results[6]?.isSuccess ?? false;

        const currentUrl = page.url();
        this.loggerService.info(`Final URL after login: ${currentUrl}`);
        const isLoginSuccessful = currentUrl.includes('unlucid.ai') || (await page.$('button[data-button-root]')) !== null;

        return {
            actions: results,
            isSuccess: clicked && googleClicked && isRedirectedBack && isLoginSuccessful,
        };
    }

    private async handleGoToAction(page: Page, request: GoToActionRequest): Promise<void> {
        try {
            const { url, gotoOptions } = request.options;
            await page.goto(url, gotoOptions);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForSelectorAction(page: Page, request: WaitForSelectorActionRequest): Promise<void> {
        try {
            const { selector, waitOptions, maxTimeoutInSeconds, intervalInSeconds, usePolling } = request.options;

            if (usePolling || typeof maxTimeoutInSeconds === 'number' || typeof intervalInSeconds === 'number') {
                await this.waitForSelectorWithPolling(page, selector, maxTimeoutInSeconds, intervalInSeconds);
                return;
            }

            const normalizedWaitOptions = this.normalizeWaitOptions(waitOptions);
            await page.waitForSelector(selector, normalizedWaitOptions);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed on selector ${request.options.selector}: ${error?.message}`);
            throw error;
        }
    }

    private async handleClickByTextAction(page: Page, request: ClickByTextActionRequest): Promise<boolean> {
        try {
            const { selector, waitOptions, matchText, isExactMatch } = request.options;
            if (waitOptions) {
                const normalizedWaitOptions = this.normalizeWaitOptions(waitOptions);
                await page.waitForSelector(selector, normalizedWaitOptions);
            }
            const elements: ElementHandle<Element>[] = await page.$$(selector);

            for (const element of elements) {
                const text = await page.evaluate((el) => el.textContent?.trim(), element);
                if (!text) {
                    continue;
                }

                const match = isExactMatch ? text === matchText : text.includes(matchText);
                if (match) {
                    await element.click();
                    return true;
                }
            }

            return false;
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed on selector ${request.options.selector}: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForNavigationAction(page: Page, request: WaitForNavigationActionRequest): Promise<void> {
        try {
            const waitOptions = this.normalizeWaitOptions(request.options.waitOptions);
            await page.waitForNavigation(waitOptions);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForFunctionAction(page: Page, request: WaitForFunctionActionRequest): Promise<void> {
        try {
            const { fn, waitOptions } = request.options;
            const normalizedWaitOptions = this.normalizeWaitOptions(waitOptions);
            await page.waitForFunction(fn, normalizedWaitOptions);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    private async handleWaitForTimeAction(request: WaitForTimeActionRequest): Promise<void> {
        try {
            const durationInSeconds = Math.max(request.options.durationInSeconds, 0);
            await new Promise((resolve) => setTimeout(resolve, durationInSeconds * 1000));
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    private async waitForSelectorWithPolling(
        page: Page,
        selector: string,
        maxTimeoutInSeconds?: number,
        intervalInSeconds?: number,
    ): Promise<void> {
        const timeoutInMs = this.secondsToMilliseconds(this.resolveSeconds(maxTimeoutInSeconds));
        const intervalInMs = this.secondsToMilliseconds(this.resolveSeconds(intervalInSeconds, this.defaultElementAppearIntervalInSeconds));
        const startedAt = Date.now();

        try {
            while (Date.now() - startedAt <= timeoutInMs) {
                const element = await page.$(selector);
                if (element) {
                    await element.dispose();
                    return;
                }

                await new Promise((resolve) => setTimeout(resolve, intervalInMs));
            }

            throw new Error(`Element ${selector} did not appear within ${timeoutInMs}ms`);
        } catch (error) {
            this.loggerService.error(`[${SimulationActionType.WAIT_FOR_SELECTOR}] failed on selector ${selector}: ${error?.message}`);
            throw error;
        }
    }

    private async handleFillInputAction(page: Page, request: FillInputActionRequest): Promise<void> {
        const { selector, value, waitOptions, clearBefore = true, delayInMs = 0 } = request.options;

        try {
            if (waitOptions) {
                const normalizedWaitOptions = this.normalizeWaitOptions(waitOptions);
                await page.waitForSelector(selector, normalizedWaitOptions);
            }

            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Input ${selector} not found`);
            }

            if (clearBefore) {
                await element.click({ clickCount: 3 });
                await page.keyboard.press('Backspace');
                await page.evaluate((el) => {
                    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                        el.value = '';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, element);
            }

            await element.type(value ?? '', { delay: delayInMs });
            await element.dispose();
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed on selector ${selector}: ${error?.message}`);
            throw error;
        }
    }

    private async handleSelectOptionAction(page: Page, request: SelectOptionActionRequest): Promise<void> {
        const { selector, optionValue, optionLabel, waitOptions } = request.options;

        try {
            if (waitOptions) {
                const normalizedWaitOptions = this.normalizeWaitOptions(waitOptions);
                await page.waitForSelector(selector, normalizedWaitOptions);
            }

            if (!optionValue && !optionLabel) {
                throw new Error('Either optionValue or optionLabel must be provided');
            }

            if (optionValue) {
                const selected = await page.select(selector, optionValue);
                if (!selected.includes(optionValue)) {
                    throw new Error(`Option value ${optionValue} not found for selector ${selector}`);
                }
            } else if (optionLabel) {
                const isSelected = await page.evaluate(
                    (sel, label) => {
                        const select = document.querySelector(sel) as HTMLSelectElement | null;
                        if (!select) {
                            return false;
                        }

                        const option = Array.from(select.options).find((opt) => opt.text.trim() === label.trim());
                        if (!option) {
                            return false;
                        }

                        select.value = option.value;
                        select.dispatchEvent(new Event('input', { bubbles: true }));
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    },
                    selector,
                    optionLabel,
                );

                if (!isSelected) {
                    throw new Error(`Option label ${optionLabel} not found for selector ${selector}`);
                }
            }
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed on selector ${selector}: ${error?.message}`);
            throw error;
        }
    }

    private normalizeWaitOptions<T extends { timeout?: number }>(waitOptions?: T): T {
        const timeoutInSeconds = this.resolveSeconds(waitOptions?.timeout);

        return {
            ...(waitOptions ?? ({} as T)),
            timeout: this.secondsToMilliseconds(timeoutInSeconds),
        };
    }

    private resolveSeconds(value?: number, fallbackSeconds: number = this.defaultWaitTimeoutInSeconds): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        return fallbackSeconds;
    }

    private secondsToMilliseconds(seconds: number): number {
        return Math.max(seconds, 0) * 1000;
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
