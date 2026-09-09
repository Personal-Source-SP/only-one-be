---
status: done
slug: create-api-data-fetcher-service
started_at: 2026-09-09
completed_at: 2026-09-09
pr_url: ~
branch: ~
---

# Plan: Tách Biệt & Chuyển Dịch HtmlFetcherService và ApiFetcherService Về Shared Module

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- `ScraperService` (`src/modules/data-provider/services/scraper.service.ts`) đang gom chung 2 chức năng khác biệt:
  1. Điều khiển Puppeteer Browser (stealth, cloudflare bypass, wait selector, retry) qua `getHtmlContent`.
  2. Gửi HTTP API request qua `BaseHttpService` (retry loop, cookies, headers, query params) qua `getApiContent`.
- `DiscoveryRunner` (`discovery.runner.ts`) tại nhánh `runApiDiscovery` đang tự tạo request Axios ad-hoc qua `BaseHttpService.get` thay vì tái sử dụng cơ chế retry/cookie/headers chuẩn hóa.
- Các sub-services (`ApiDataProviderScraperService`, `ApiDataProviderSearchService`) phụ thuộc vào `ScraperService` chỉ để gọi API, gây coupling không cần thiết với thư viện Puppeteer.
- **Invariants bảo toàn**:
  - Cơ chế retry, delay, timeout và các tham số `stealthMode`, `cloudflareBypass`, `waitForSelector` của Puppeteer không thay đổi.
  - Cấu trúc response `IScraperResponse` (`status`, `html`, `data`, `title`, `url`, `execution_time`, `error_code`, `error_message`) được giữ nguyên để tương thích 100% với các consumers.
  - `SharedModule` là `@Global()` nên các services mới trong `src/shared/services/` sẽ sẵn sàng cho toàn bộ ứng dụng mà không cần import lại ở từng module con.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

- **Type Signatures & Code Contracts**:
  - `HtmlFetcherService` (`src/shared/services/html-fetcher.service.ts`):
    ```typescript
    @Injectable()
    export class HtmlFetcherService implements OnModuleDestroy {
        async onModuleDestroy(): Promise<void>;
        async getHtmlContent(url: string, targetConfig: ITargetConfig): Promise<IScraperResponse>;
    }
    ```
  - `ApiFetcherService` (`src/shared/services/api-fetcher.service.ts`):
    ```typescript
    @Injectable()
    export class ApiFetcherService {
        async getApiContent(url: string, targetConfig: ITargetConfig, lastScrapedTimestamp?: Date): Promise<IScraperResponse>;
        async fetchApiContent(url: string, targetConfig: ITargetConfig, lastScrapedTimestamp?: Date): Promise<IScraperResponse>; // Alias
    }
    ```

- **AST Seams & Callers**:
  - `SharedModule` (`src/shared/shared.module.ts`): Bổ sung `HtmlFetcherService` và `ApiFetcherService` vào `providers` và `exports`.
  - `DataProviderModule` (`src/modules/data-provider/data-provider.module.ts`): Gỡ bỏ `ScraperService` khỏi `services`/`providers`/`exports`.
  - `DiscoveryRunner` (`src/modules/data-provider/runners/discovery.runner.ts`): Thay `ScraperService` bằng `HtmlFetcherService` (cho `fetchHtml`) và `ApiFetcherService` (cho `runApiDiscovery`).
  - `ApiDataProviderScraperService` (`src/modules/data-provider/services/data-provider-scraper/api-data-provider-scraper.service.ts`): Inject `ApiFetcherService`.
  - `GenericDataProviderScraperService` (`src/modules/data-provider/services/data-provider-scraper/generic-data-provider-scraper.service.ts`): Inject `HtmlFetcherService`.
  - `ApiDataProviderSearchService` (`src/modules/data-provider/services/data-provider-search/api-data-provider-search.service.ts`): Inject `ApiFetcherService`.
  - `GenericDataProviderSearchService` (`src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts`): Inject `HtmlFetcherService`.
  - Xóa bỏ `src/modules/data-provider/services/scraper.service.ts`.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/
├── shared/
│   ├── services/
│   │   ├── [NEW] html-fetcher.service.ts                     # Chuyên trách Puppeteer HTML scraping & rendering
│   │   └── [NEW] api-fetcher.service.ts                      # Chuyên trách HTTP/REST API fetching với retry & headers
│   └── [MODIFY] shared.module.ts                             # Export HtmlFetcherService và ApiFetcherService
└── modules/data-provider/
    ├── [MODIFY] data-provider.module.ts                      # Gỡ bỏ ScraperService khỏi providers
    ├── runners/
    │   └── [MODIFY] discovery.runner.ts                      # Inject HtmlFetcherService và ApiFetcherService
    └── services/
        ├── [DELETE] scraper.service.ts                       # Xóa bỏ sau khi tách thành 2 service mới trong shared
        ├── data-provider-scraper/
        │   ├── [MODIFY] api-data-provider-scraper.service.ts # Inject ApiFetcherService
        │   └── [MODIFY] generic-data-provider-scraper.service.ts # Inject HtmlFetcherService
        └── data-provider-search/
            ├── [MODIFY] api-data-provider-search.service.ts  # Inject ApiFetcherService
            └── [MODIFY] generic-data-provider-search.service.ts # Inject HtmlFetcherService
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/shared/services/html-fetcher.service.ts` | `HtmlFetcherService` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[NEW]` | `src/shared/services/api-fetcher.service.ts` | `ApiFetcherService` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/shared/shared.module.ts` | `SharedModule` | `Order 1, Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/discovery.runner.ts` | `DiscoveryRunner` | `Order 3` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-scraper/api-data-provider-scraper.service.ts` | `ApiDataProviderScraperService` | `Order 3` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-scraper/generic-data-provider-scraper.service.ts` | `GenericDataProviderScraperService` | `Order 3` | `npx tsc -p tsconfig.build.json --noEmit` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-search/api-data-provider-search.service.ts` | `ApiDataProviderSearchService` | `Order 3` | `npx tsc -p tsconfig.build.json --noEmit` |
| **8** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts` | `GenericDataProviderSearchService` | `Order 3` | `npx tsc -p tsconfig.build.json --noEmit` |
| **9** | `[x]` | `[DELETE]` | `src/modules/data-provider/services/scraper.service.ts` | `ScraperService` | `Order 4..8` | `npx tsc -p tsconfig.build.json --noEmit` |
| **10** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | `DataProviderModule` | `Order 9` | `npx tsc -p tsconfig.build.json --noEmit` |


## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/shared/services/html-fetcher.service.ts`
> **Action**: Khởi tạo `HtmlFetcherService` chuyên trách Puppeteer lifecycle, stealth mode, cloudflare bypass, wait selector và retry loop.

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { IScraperResponse, ITargetConfig } from '../../modules/data-provider/interfaces';
import { LoggerService } from './logger.service';

@Injectable()
export class HtmlFetcherService implements OnModuleDestroy {
    private browser: Browser | null = null;
    private readonly loggerService: LoggerService = new LoggerService(HtmlFetcherService.name);

    constructor() {
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

            const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

            this.browser = await puppeteer.launch({
                headless: stealthMode ? 'shell' : true,
                executablePath: executablePath || undefined,
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
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
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
```

### 2. `[NEW]` `src/shared/services/api-fetcher.service.ts`
> **Action**: Khởi tạo `ApiFetcherService` chuyên trách HTTP API request với retry loop, delay, cookies, headers và query params.

```typescript
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';

import { IScraperResponse, ITargetConfig } from '../../modules/data-provider/interfaces';
import { BaseHttpService } from './base-http.service';
import { LoggerService } from './logger.service';

@Injectable()
export class ApiFetcherService {
    private readonly loggerService: LoggerService = new LoggerService(ApiFetcherService.name);

    constructor(private readonly baseHttpService: BaseHttpService) {}

    async getApiContent(url: string, targetConfig: ITargetConfig, lastScrapedTimestamp?: Date): Promise<IScraperResponse> {
        const { retryAttempts = 3, retryDelay = 2000, timeout = 30000, userAgent, headers, cookies, queryParams, firstQueryParams } =
            targetConfig || {};

        const startTime = Date.now();

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                const config: AxiosRequestConfig = {
                    timeout,
                    headers: {
                        'User-Agent':
                            userAgent ||
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        ...headers,
                    },
                };

                if (cookies && cookies.length > 0) {
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

    async fetchApiContent(url: string, targetConfig: ITargetConfig, lastScrapedTimestamp?: Date): Promise<IScraperResponse> {
        return this.getApiContent(url, targetConfig, lastScrapedTimestamp);
    }
}
```

### 3. `[MODIFY]` `src/shared/shared.module.ts`
> **Action**: Khai báo và export `HtmlFetcherService` và `ApiFetcherService`.

```diff
@@ -9,8 +9,10 @@
 import { AppConfigService } from './services/app-config.service';
 import { BaseHttpService } from './services/base-http.service';
+import { ApiFetcherService } from './services/api-fetcher.service';
+import { HtmlFetcherService } from './services/html-fetcher.service';
 import { LocalFileService } from './services/local-file.service';
 import { LoggerService } from './services/logger.service';
 import { PuppeteerService } from './services/puppeteer.service';
 import { UtilsService } from './services/utils.service';
 import { JwtStrategy } from './strategy/jwt.strategy';
 
 const helpers = [FileHelper];
-const providers = [AppConfigService, LoggerService, UtilsService, BaseHttpService, PuppeteerService, LocalFileService, JwtStrategy];
+const providers = [
+    AppConfigService,
+    LoggerService,
+    UtilsService,
+    BaseHttpService,
+    ApiFetcherService,
+    HtmlFetcherService,
+    PuppeteerService,
+    LocalFileService,
+    JwtStrategy,
+];
```

### 4. `[MODIFY]` `src/modules/data-provider/runners/discovery.runner.ts`
> **Action**: Thay thế `ScraperService` và `BaseHttpService.get` bằng `HtmlFetcherService` và `ApiFetcherService`.

```diff
@@ -7,4 +7,6 @@
 import { AppException } from '../../../exceptions/app.exception';
 import { BaseHttpService } from '../../../shared/services/base-http.service';
+import { ApiFetcherService } from '../../../shared/services/api-fetcher.service';
+import { HtmlFetcherService } from '../../../shared/services/html-fetcher.service';
 import { DataProviderError } from '../constants/data-provider-error';
 import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
@@ -27,5 +29,4 @@
 import { DiscoveryValidationService } from '../services/discovery-validation.service';
-import { ScraperService } from '../services/scraper.service';
 
 @Injectable()
 export class DiscoveryRunner {
     private readonly logger = new Logger(DiscoveryRunner.name);
 
     constructor(
-        private readonly scraperService: ScraperService,
+        private readonly htmlFetcherService: HtmlFetcherService,
+        private readonly apiFetcherService: ApiFetcherService,
         private readonly baseHttpService: BaseHttpService,
         private readonly extractDataHelper: ExtractDataHelper,
@@ -114,14 +115,11 @@
         if (!targetConfig?.functionGenerator) {
             throw new Error(`Data provider feature is missing 'functionGenerator' configuration for session ${session.id}`);
         }
 
-        const response = await this.baseHttpService.get<any>(session.targetUrl, {
-            timeout: targetConfig?.timeout || 10000,
-            headers: {
-                'User-Agent':
-                    targetConfig?.userAgent ||
-                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
-                ...(targetConfig?.headers || {}),
-            },
-        });
-
-        const rawData = response.data;
+        const apiRes = await this.apiFetcherService.getApiContent(session.targetUrl, targetConfig);
+        if (apiRes.status !== 'success' || !apiRes.data) {
+            this.logger.warn(`API fetch failed for session ${session.id}: ${apiRes.error_message}`);
+            return discoveredRecords;
+        }
+
+        const rawData = apiRes.data;
         const result = await this.extractDataHelper.runApiFunctionExtractData({
@@ -260,3 +258,3 @@
         if (isDynamicOrProtected) {
             try {
-                const result = await this.scraperService.getHtmlContent(url, targetConfig);
+                const result = await this.htmlFetcherService.getHtmlContent(url, targetConfig);
                 if (result.status === 'success' && result.html) {
```

### 5. `[MODIFY]` `src/modules/data-provider/services/data-provider-scraper/api-data-provider-scraper.service.ts`
> **Action**: Đổi import và inject từ `ScraperService` sang `ApiFetcherService`.

```diff
@@ -6,2 +6,3 @@
 import { ExtractDataHelper } from '../../helpers/extract-data.helper';
+import { ApiFetcherService } from '../../../../shared/services/api-fetcher.service';
 import {
@@ -14,3 +15,2 @@
 } from '../../interfaces';
-import { ScraperService } from '../scraper.service';
 
 @Injectable()
 export class ApiDataProviderScraperService implements IDataProviderScraperService {
     constructor(
-        private readonly scraperService: ScraperService,
+        private readonly apiFetcherService: ApiFetcherService,
         private readonly extractDataHelper: ExtractDataHelper,
@@ -114,3 +114,3 @@
             if (!data) {
-                const dataContent = await this.scraperService.getApiContent(url, targetConfig, lastScrapedTimestamp);
+                const dataContent = await this.apiFetcherService.getApiContent(url, targetConfig, lastScrapedTimestamp);
                 if (dataContent.status !== 'success') {
```

### 6. `[MODIFY]` `src/modules/data-provider/services/data-provider-scraper/generic-data-provider-scraper.service.ts`
> **Action**: Đổi import và inject từ `ScraperService` sang `HtmlFetcherService`.

```diff
@@ -6,2 +6,3 @@
 import { ExtractDataHelper } from '../../helpers/extract-data.helper';
+import { HtmlFetcherService } from '../../../../shared/services/html-fetcher.service';
 import {
@@ -14,3 +15,2 @@
 } from '../../interfaces';
-import { ScraperService } from '../scraper.service';
 
 @Injectable()
 export class GenericDataProviderScraperService implements IDataProviderScraperService {
     constructor(
-        private readonly scraperService: ScraperService,
+        private readonly htmlFetcherService: HtmlFetcherService,
         private readonly extractDataHelper: ExtractDataHelper,
@@ -114,3 +114,3 @@
             if (!html) {
-                const htmlContent = await this.scraperService.getHtmlContent(url, targetConfig);
+                const htmlContent = await this.htmlFetcherService.getHtmlContent(url, targetConfig);
                 if (htmlContent.status !== 'success') {
```

### 7. `[MODIFY]` `src/modules/data-provider/services/data-provider-search/api-data-provider-search.service.ts`
> **Action**: Đổi import và inject từ `ScraperService` sang `ApiFetcherService`.

```diff
@@ -3,4 +3,4 @@
 import { ExtractSearchDataHelper } from '../../helpers/extract-search-data.helper';
 import { IDataProviderSearchService, IGetExtractSearchDataRequest, ISearchExtractDataResponse } from '../../interfaces';
-import { ScraperService } from '../scraper.service';
+import { ApiFetcherService } from '../../../../shared/services/api-fetcher.service';
 
 @Injectable()
 export class ApiDataProviderSearchService implements IDataProviderSearchService {
     constructor(
-        private readonly scraperService: ScraperService,
+        private readonly apiFetcherService: ApiFetcherService,
         private readonly extractSearchDataHelper: ExtractSearchDataHelper,
@@ -21,3 +21,3 @@
             if (!data) {
-                const apiRes = await this.scraperService.getApiContent(url, targetConfig);
+                const apiRes = await this.apiFetcherService.getApiContent(url, targetConfig);
                 if (apiRes.status !== 'success') {
```

### 8. `[MODIFY]` `src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts`
> **Action**: Đổi import và inject từ `ScraperService` sang `HtmlFetcherService`.

```diff
@@ -4,4 +4,4 @@
 import { ExtractSearchDataHelper } from '../../helpers/extract-search-data.helper';
 import { IDataProviderSearchService, IGetExtractSearchDataRequest, ISearchExtractDataResponse } from '../../interfaces';
-import { ScraperService } from '../scraper.service';
+import { HtmlFetcherService } from '../../../../shared/services/html-fetcher.service';
 
 @Injectable()
 export class GenericDataProviderSearchService implements IDataProviderSearchService {
     constructor(
-        private readonly scraperService: ScraperService,
+        private readonly htmlFetcherService: HtmlFetcherService,
         private readonly extractSearchDataHelper: ExtractSearchDataHelper,
@@ -23,3 +23,3 @@
             if (!html) {
-                const htmlContent = await this.scraperService.getHtmlContent(url, targetConfig);
+                const htmlContent = await this.htmlFetcherService.getHtmlContent(url, targetConfig);
                 if (htmlContent.status !== 'success') {
```

### 9. `[DELETE]` `src/modules/data-provider/services/scraper.service.ts`
> **Action**: Xóa bỏ file `scraper.service.ts` do toàn bộ logic đã được chuyển sang `HtmlFetcherService` và `ApiFetcherService` trong `src/shared/services/`.

### 10. `[MODIFY]` `src/modules/data-provider/data-provider.module.ts`
> **Action**: Gỡ bỏ import và provider `ScraperService`.

```diff
@@ -51,3 +51,2 @@
 import { ItemService } from './services/item.service';
-import { ScraperService } from './services/scraper.service';
 import { ScrapingDataService } from './services/scraping-data.service';
@@ -82,3 +81,2 @@
     ItemService,
-    ScraperService,
     ScrapingDataService,
```

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `[x]` Typecheck & compilation: `npx tsc -p tsconfig.build.json --noEmit` (PASS - Exit code 0, 0 errors)
  - `[x]` Code linting & formatting: `ESLINT_USE_FLAT_CONFIG=false npx eslint ...` (PASS - Exit code 0, 0 errors)
- **Manual Checks**:
  - `[x]` Kiểm tra toàn bộ callers (`DiscoveryRunner`, `ApiDataProviderScraperService`, `GenericDataProviderScraperService`, `ApiDataProviderSearchService`, `GenericDataProviderSearchService`) khởi tạo thành công với `HtmlFetcherService` và `ApiFetcherService` từ global `SharedModule`.

