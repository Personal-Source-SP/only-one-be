import { Injectable } from '@nestjs/common';
import { ElementHandle, type Page } from 'puppeteer';
import { LoggerService } from '../../../shared/services/logger.service';
import { SimulationActionType } from '../enums';
import {
    ClickByTextActionRequest,
    FillInputActionRequest,
    GoToActionRequest,
    SelectOptionActionRequest,
    WaitForFunctionActionRequest,
    WaitForNavigationActionRequest,
    WaitForSelectorActionRequest,
    WaitForTimeActionRequest,
} from '../interfaces/simulation-action.interface';

@Injectable()
export class BrowserHelper {
    private readonly defaultWaitTimeoutInSeconds = 10;
    private readonly defaultElementAppearIntervalInSeconds = 0.5;
    private readonly loggerService: LoggerService = new LoggerService(BrowserHelper.name);

    async handleGoToAction(page: Page, request: GoToActionRequest): Promise<void> {
        try {
            const { url, gotoOptions } = request.options;
            await page.goto(url, gotoOptions);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    async handleWaitForSelectorAction(page: Page, request: WaitForSelectorActionRequest): Promise<void> {
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

    async handleClickByTextAction(page: Page, request: ClickByTextActionRequest): Promise<boolean> {
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

    async handleWaitForNavigationAction(page: Page, request: WaitForNavigationActionRequest): Promise<void> {
        try {
            const waitOptions = this.normalizeWaitOptions(request.options.waitOptions);
            await page.waitForNavigation(waitOptions);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    async handleWaitForFunctionAction(page: Page, request: WaitForFunctionActionRequest): Promise<void> {
        try {
            const { fn, waitOptions } = request.options;
            const normalizedWaitOptions = this.normalizeWaitOptions(waitOptions);
            await page.waitForFunction(fn, normalizedWaitOptions);
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    async handleWaitForTimeAction(request: WaitForTimeActionRequest): Promise<void> {
        try {
            const durationInSeconds = Math.max(request.options.durationInSeconds, 0);
            await new Promise((resolve) => setTimeout(resolve, durationInSeconds * 1000));
        } catch (error) {
            this.loggerService.error(`[${request.type}] failed: ${error?.message}`);
            throw error;
        }
    }

    async waitForSelectorWithPolling(
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

    async handleFillInputAction(page: Page, request: FillInputActionRequest): Promise<void> {
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

    async handleSelectOptionAction(page: Page, request: SelectOptionActionRequest): Promise<void> {
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
}
