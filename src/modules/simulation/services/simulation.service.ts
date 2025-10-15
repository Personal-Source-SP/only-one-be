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

            // Add random mouse movements and scrolling to look more human
            await page.mouse.move(Math.random() * 100, Math.random() * 100);
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

            // Random scroll to simulate human behavior
            await page.evaluate(() => {
                window.scrollTo(0, Math.random() * 200);
            });
            await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

            // Random mouse movements
            for (let i = 0; i < 3; i++) {
                await page.mouse.move(Math.random() * 800 + 100, Math.random() * 600 + 100);
                await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 500));
            }

            // Check for CAPTCHA or security challenges
            const captchaSelectors = [
                'iframe[src*="recaptcha"]',
                'div[class*="captcha"]',
                'div[class*="recaptcha"]',
                'div[id*="captcha"]',
                'div[class*="challenge"]',
                'div[class*="security"]',
            ];

            let hasCaptcha = false;
            for (const selector of captchaSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        this.loggerService.warn(`CAPTCHA detected with selector: ${selector}`);
                        hasCaptcha = true;
                        break;
                    }
                } catch (error) {
                    // Continue checking other selectors
                }
            }

            if (hasCaptcha) {
                this.loggerService.error('CAPTCHA or security challenge detected. Manual intervention required.');
                throw new Error('CAPTCHA detected - manual intervention required');
            }

            // Fill email
            await page.waitForSelector('input[type="email"]#identifierId', { timeout: 10000 });

            // Clear the field first
            await page.click('input[type="email"]#identifierId');
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');

            // Type with human-like delays and occasional pauses
            const email = request.emails[0].email;
            for (let i = 0; i < email.length; i++) {
                const char = email[i];
                await page.keyboard.type(char);

                // Add occasional longer pauses to simulate thinking
                if (Math.random() < 0.1) {
                    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 500));
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
                }

                // Occasionally move mouse to simulate human behavior
                if (Math.random() < 0.05) {
                    await page.mouse.move(Math.random() * 200 + 100, Math.random() * 200 + 100);
                }
            }

            // Wait a bit for the form to process the email with random delay
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

            // Random mouse movement to simulate human behavior
            await page.mouse.move(Math.random() * 400 + 200, Math.random() * 300 + 200);

            // Try multiple selectors for the "Tiếp theo" button
            let nextClicked = false;
            const nextButtonSelectors = [
                '#identifierNext button',
                'button[jsname="LgbsSe"]',
                'button[type="submit"]',
                'div#identifierNext button span',
                'button span:contains("Tiếp theo")',
            ];

            for (const selector of nextButtonSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    const buttons = await page.$$(selector);

                    for (const button of buttons) {
                        const text = await page.evaluate((el) => el.textContent?.trim(), button);
                        if (text && (text.includes('Tiếp theo') || text.includes('Next'))) {
                            this.loggerService.info(`Click next button after entering email with selector: ${selector}`);

                            // Add human-like delay before clicking
                            await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

                            // Move mouse to button before clicking
                            const box = await button.boundingBox();
                            if (box) {
                                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                                await new Promise((resolve) => setTimeout(resolve, 200));
                            }

                            await button.click();
                            this.loggerService.info(`Click next button after entering email success`);
                            nextClicked = true;
                            break;
                        }
                    }

                    if (nextClicked) break;
                } catch (error) {
                    this.loggerService.warn(`Selector ${selector} not found, trying next...`);
                    continue;
                }
            }

            if (!nextClicked) {
                this.loggerService.error('Could not find or click the next button after entering email');
                throw new Error('Next button not found');
            }

            // Wait for navigation go to google login page
            await page.waitForNavigation({ timeout: 15000 });

            // Fill password
            await page.waitForSelector('input[type="password"][name="Passwd"]', { timeout: 10000 });

            // Clear the field first
            await page.click('input[type="password"][name="Passwd"]');
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');

            // Type with human-like delays and occasional pauses
            const password = request.emails[0].password;
            for (let i = 0; i < password.length; i++) {
                const char = password[i];
                await page.keyboard.type(char);

                // Add occasional longer pauses to simulate thinking
                if (Math.random() < 0.1) {
                    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 500));
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
                }

                // Occasionally move mouse to simulate human behavior
                if (Math.random() < 0.05) {
                    await page.mouse.move(Math.random() * 200 + 100, Math.random() * 200 + 100);
                }
            }

            // Wait a bit for the form to process the password with random delay
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

            // Random mouse movement to simulate human behavior
            await page.mouse.move(Math.random() * 400 + 200, Math.random() * 300 + 200);

            // Try multiple selectors for the password "Tiếp theo" button
            let passwordNextClicked = false;
            const passwordNextButtonSelectors = [
                'button.VfPpkd-LgbsSe',
                'button[jsname="LgbsSe"]',
                'button[type="submit"]',
                'button span:contains("Tiếp theo")',
                'div#passwordNext button',
            ];

            for (const selector of passwordNextButtonSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    const buttons = await page.$$(selector);

                    for (const button of buttons) {
                        const text = await page.evaluate((el) => el.textContent?.trim(), button);
                        if (text && (text.includes('Tiếp theo') || text.includes('Next'))) {
                            this.loggerService.info(`Click next button after entering password with selector: ${selector}`);

                            // Add human-like delay before clicking
                            await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

                            // Move mouse to button before clicking
                            const box = await button.boundingBox();
                            if (box) {
                                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                                await new Promise((resolve) => setTimeout(resolve, 200));
                            }

                            await button.click();
                            this.loggerService.info(`Click next button after entering password success`);
                            passwordNextClicked = true;
                            break;
                        }
                    }

                    if (passwordNextClicked) break;
                } catch (error) {
                    this.loggerService.warn(`Password next button selector ${selector} not found, trying next...`);
                    continue;
                }
            }

            if (!passwordNextClicked) {
                this.loggerService.error('Could not find or click the next button after entering password');
                throw new Error('Password next button not found');
            }

            // Wait for navigation after password submit
            await page.waitForNavigation({ timeout: 15000 });

            // Check if we're redirected back to the original site or if there are additional steps
            const currentUrl = page.url();
            this.loggerService.info(`Final URL after login: ${currentUrl}`);

            // Check if login was successful by looking for success indicators
            const isLoginSuccessful =
                currentUrl.includes('unlucid.ai') ||
                currentUrl.includes('accounts.google.com/signin/continue') ||
                (await page.$('button[data-button-root]')) !== null;

            return {
                isSuccess: clicked && nextClicked && passwordNextClicked && isLoginSuccessful,
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
