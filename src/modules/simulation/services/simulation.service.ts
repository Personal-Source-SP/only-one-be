import { Injectable, NotFoundException } from '@nestjs/common';
import { type BrowserContext, type Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { SimulateUnlucidAiRequest } from '../dtos/requests/simulate-unlucid-ai.request';
import { LoggerService } from './../../../shared/services/logger.service';
import { PuppeteerService } from './../../../shared/services/puppeteer.service';
import { SimulateResponse } from './../dtos/responses/simulate.response';
import { PageSite } from './../enums/page-site.enum';

@Injectable()
export class SimulationService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly puppeteerService: PuppeteerService,
    ) {}

    async simulateUnlucidAI(request: SimulateUnlucidAiRequest): Promise<SimulateResponse<boolean>> {
        const pageId = uuidv4();
        const page: Page = await this.getCurrentPage(pageId);

        try {
            // Navigate the page to a URL
            await page.goto(PageSite.UNLUCID_AI);

            // Set screen size
            await page.setViewport({ width: 1080, height: 1024 });

            return {
                isSuccess: true,
            };
        } catch (error) {
            this.loggerService.error(`Simulate Unlucid AI failed: ${error?.message}`);

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

            if (!incognitoContext) {
                const context: BrowserContext = await browser.createBrowserContext();
                return context.newPage();
            }

            const pages: Page[] = await incognitoContext.pages();

            if (pages.length > 0) {
                return pages[0];
            }

            return incognitoContext.newPage();
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
