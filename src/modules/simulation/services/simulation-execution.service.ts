import { Injectable, NotFoundException } from '@nestjs/common';
import { type BrowserContext, type Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../../../shared/services/logger.service';
import { PuppeteerService } from '../../../shared/services/puppeteer.service';
import { SimulateResponse } from '../dtos/responses/simulate.response';
import { SimulationService } from '../enums';
import { SimulationActionType } from '../enums/simulation-action.enum';
import { BrowserHelper } from '../helpers/browser.helper';
import {
    ServiceExecutionInternalResult,
    type SimulationActionRequest,
    type SimulationActionResult,
    type SimulationExecuteRequest,
    type SimulationExecutionSummary,
} from '../interfaces';

@Injectable()
export class SimulationExecutionService {
    private readonly loggerService: LoggerService = new LoggerService(SimulationExecutionService.name);

    constructor(
        private readonly browserHelper: BrowserHelper,
        private readonly puppeteerService: PuppeteerService,
    ) {}

    async execute<TPayload>(request: SimulationExecuteRequest<TPayload>): Promise<SimulateResponse<SimulationExecutionSummary>> {
        const serviceExecution = request?.serviceExecution;
        if (!serviceExecution) throw new NotFoundException('Service execution is required');

        const pageId = uuidv4();
        const startedAt = new Date();

        const page = await this.getCurrentPage(pageId);

        let executionError: Error | null = null;
        let executionResult: ServiceExecutionInternalResult | null = null;

        try {
            switch (serviceExecution) {
                case SimulationService.UNLUCID_AI: {
                    executionResult = await this.runUnlucidAi(page);
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

        const isSuccess = executionResult?.isSuccess ?? false;
        const actionResults = executionResult?.actions ?? [];

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
            errorMessage: executionError ? executionError.message : 'Simulation finished with errors',
        };
    }

    private async executeSimulationActions(page: Page, actions: SimulationActionRequest[]): Promise<ServiceExecutionInternalResult> {
        const actionResults: SimulationActionResult[] = [];

        let stepError: string | undefined;
        let errorMessage: string | undefined;

        for (const [index, action] of actions.entries()) {
            let isSuccess = false;

            const actionType = action.type;
            const actionStartedAt = Date.now();

            try {
                switch (actionType) {
                    case SimulationActionType.GO_TO:
                        await this.browserHelper.handleGoToAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.CLICK_BY_TEXT:
                        isSuccess = await this.browserHelper.handleClickByTextAction(page, action);
                        break;
                    case SimulationActionType.WAIT_FOR_SELECTOR:
                        await this.browserHelper.handleWaitForSelectorAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_NAVIGATION:
                        await this.browserHelper.handleWaitForNavigationAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_FUNCTION:
                        await this.browserHelper.handleWaitForFunctionAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.WAIT_FOR_TIME:
                        await this.browserHelper.handleWaitForTimeAction(action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.FILL_INPUT:
                        await this.browserHelper.handleFillInputAction(page, action);
                        isSuccess = true;
                        break;
                    case SimulationActionType.SELECT_OPTION:
                        await this.browserHelper.handleSelectOptionAction(page, action);
                        isSuccess = true;
                        break;
                    default:
                        throw new Error(`[${actionType}] unsupported action type`);
                }
            } catch (error) {
                stepError = actionType;
                errorMessage = error?.message ?? 'Execution failed';
            }

            if (stepError || !isSuccess) {
                return {
                    isSuccess: false,
                    actions: actionResults,
                    stepError,
                    errorMessage,
                };
            }

            const actionEndedAt = Date.now();
            actionResults.push({
                index,
                isSuccess,
                type: actionType,
                durationInMs: actionEndedAt - actionStartedAt,
                endedAt: new Date(actionEndedAt).toISOString(),
                startedAt: new Date(actionStartedAt).toISOString(),
            });
        }

        return {
            stepError,
            errorMessage,
            isSuccess: true,
            actions: actionResults,
        };
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
        return results;
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
