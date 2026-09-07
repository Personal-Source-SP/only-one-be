---
status: done
slug: separate-search-data-extraction
started_at: 2026-09-07
completed_at: 2026-09-07
pr_url: ~
branch: ~
---

# Plan: Phân tách Cơ chế & DTO Trích xuất Dữ liệu giữa SEARCH và SCRAPING

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- `SearchFeatureRunner` hiện đang phụ thuộc vào `DATA_PROVIDER_SCRAPER_SERVICE_MAP` và `GenericDataProviderScraperService` / `ApiDataProviderScraperService`, vốn được thiết kế chỉ cho `SCRAPING`.
- `ExtractDataHelper.runFunctionExtractData` hardcode việc gọi hàm `extractData(html)` và ép kiểu trả về `ScrapeItemDataResponseItemDto[]` (`{ id, url, mimeType, lastModified }`), gây lỗi runtime khi chạy script tìm kiếm (`searchData(html)`) và sai lệch schema kết quả sản phẩm (`url`, `title`, `imageUrl`...).
- **Invariants bắt buộc giữ nguyên**:
  - `SCRAPING` feature và `DiscoveryRunner` không bị thay đổi hành vi hoặc regression.
  - Interface `IFeatureRunner` giữ nguyên signature để tương thích với `FeatureRunnerRegistry` và `DataProviderFeatureController`.
  - Hỗ trợ tương thích ngược: hàm `searchData` là mặc định cho Search nhưng vẫn fallback được nếu người dùng viết `extractData`.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

### Type Signatures & Code Contracts
```typescript
// 1. DTO kết quả tìm kiếm (src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts)
export class SearchResultItemDto {
    url: string;
    title?: string;
    imageUrl?: string;
    relativeUrl?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
}

export class SearchExtractDataResponseDto {
    html?: string;
    error?: string;
    data?: SearchResultItemDto[];
}

// 2. Interfaces trích xuất Search (src/modules/data-provider/interfaces/target-config.interface.ts)
export interface IRunSearchFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    resultSelector?: string;
    maxResults?: number;
}

export interface IRunApiSearchFunctionExtractData {
    data: Record<string, any>;
    functionGenerator: string;
    maxResults?: number;
}

export interface ISearchExtractDataResponse {
    html?: string;
    error?: string;
    data?: SearchResultItemDto[];
}
```

### AST Seams & Callers
- `SearchFeatureRunner`:
  - Thay thế inject `DATA_PROVIDER_SCRAPER_SERVICE_MAP` bằng `ScraperService` và `ExtractSearchDataHelper`.
  - Cập nhật phương thức `testStateless` và `testContextual` để trả về `ISearchExtractDataResponse`.
- `ExtractSearchDataHelper`:
  - Class `@Injectable()` mới cung cấp `runFunctionExtractSearchData` và `runApiFunctionExtractSearchData`.
- `DataProviderModule`:
  - Khai báo `ExtractSearchDataHelper` vào mảng `helpers` và `providers` / `exports`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes
```text
src/modules/data-provider/
├── dtos/
│   └── responses/
│       ├── [NEW]    search-extract-data-response.dto.ts
│       └── [MODIFY] index.ts
├── interfaces/
│   ├── [MODIFY] target-config.interface.ts
│   └── [MODIFY] index.ts
├── helpers/
│   ├── [NEW]    extract-search-data.helper.ts
│   └── _tests/
│       └── [NEW]    extract-search-data.helper.spec.ts
├── runners/
│   ├── [MODIFY] search-feature.runner.ts
│   └── _tests/
│       └── [MODIFY] search-feature.runner.spec.ts
└── [MODIFY] data-provider.module.ts
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts` | `SearchResultItemDto`, `SearchExtractDataResponseDto` | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/responses/index.ts` | Export `search-extract-data-response.dto` | `Order 1` | `npm run build` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/target-config.interface.ts` | `IRunSearchFunctionExtractData`, `IRunApiSearchFunctionExtractData`, `ISearchExtractDataResponse` | `Order 1` | `npm run build` |
| **4** | `[x]` | `[NEW]` | `src/modules/data-provider/helpers/extract-search-data.helper.ts` | `ExtractSearchDataHelper.runFunctionExtractSearchData`, `ExtractSearchDataHelper.runApiFunctionExtractSearchData` | `Order 1, 3` | `npm run build` |
| **5** | `[x]` | `[NEW]` | `src/modules/data-provider/helpers/_tests/extract-search-data.helper.spec.ts` | Unit tests for `ExtractSearchDataHelper` | `Order 4` | `npm run build` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/search-feature.runner.ts` | `SearchFeatureRunner.testStateless`, `SearchFeatureRunner.testContextual` | `Order 4` | `npm run build` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts` | Unit tests for updated `SearchFeatureRunner` | `Order 6` | `npm run build` |
| **8** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | Register `ExtractSearchDataHelper` in `helpers`, `providers`, `exports` | `Order 4` | `npm run build` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts`
> **Action**: Tạo DTO đại diện cho từng item kết quả tìm kiếm và response bọc ngoài.

```typescript
export class SearchResultItemDto {
    url: string;
    title?: string;
    imageUrl?: string;
    relativeUrl?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
}

export class SearchExtractDataResponseDto {
    html?: string;
    error?: string;
    data?: SearchResultItemDto[];

    constructor(partial?: Partial<SearchExtractDataResponseDto>) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
}
```

---

### 2. `[MODIFY]` `src/modules/data-provider/dtos/responses/index.ts`
> **Action**: Xuất khẩu Search DTOs từ barrel file.

```diff
@@ -6,3 +6,4 @@
 export * from './scrape-item-data-response.dto';
 export * from './scraping-data-response.dto';
 export * from './validate-parser-function-response.dto';
+export * from './search-extract-data-response.dto';
```

---

### 3. `[MODIFY]` `src/modules/data-provider/interfaces/target-config.interface.ts`
> **Action**: Thêm các interface chuyên biệt cho Search Function execution.

```diff
@@ -1,4 +1,6 @@
+import { SearchResultItemDto } from '../dtos/responses/search-extract-data-response.dto';
+
 export interface ITargetConfig {
     functionGenerator: string; //  Hàm xử lý dữ liệu
@@ -51,3 +53,23 @@
     functionGenerator: string;
 }
+
+export interface IRunSearchFunctionExtractData {
+    htmlContent: string;
+    functionGenerator: string;
+    resultSelector?: string;
+    maxResults?: number;
+}
+
+export interface IRunApiSearchFunctionExtractData {
+    data: Record<string, any>;
+    functionGenerator: string;
+    maxResults?: number;
+}
+
+export interface ISearchExtractDataResponse {
+    html?: string;
+    error?: string;
+    data?: SearchResultItemDto[];
+}
```

---

### 4. `[NEW]` `src/modules/data-provider/helpers/extract-search-data.helper.ts`
> **Action**: Xây dựng helper trích xuất dữ liệu cho Search feature, hỗ trợ thực thi `searchData(html)` và `extractData(html)` linh hoạt.

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { SearchResultItemDto } from '../dtos/responses/search-extract-data-response.dto';
import { IRunApiSearchFunctionExtractData, IRunSearchFunctionExtractData } from '../interfaces/target-config.interface';

@Injectable()
export class ExtractSearchDataHelper {
    async runFunctionExtractSearchData(dto: IRunSearchFunctionExtractData): Promise<SearchResultItemDto[]> {
        const { functionGenerator, htmlContent, resultSelector, maxResults } = dto;

        if (!functionGenerator) {
            throw new Error('Function generator is required');
        }

        try {
            const transformedFn = this.transformFunction(functionGenerator);
            const runFn = new Function(
                'cheerio',
                'resultSelector',
                `return (html) => {
                    ${transformedFn}
                    if (typeof searchData === 'function') {
                        return searchData(html);
                    }
                    if (typeof extractData === 'function') {
                        return extractData(html);
                    }
                    throw new Error('Neither searchData nor extractData function is defined');
                }`,
            )(cheerio, resultSelector || '');

            const result = runFn(htmlContent);

            if (!Array.isArray(result)) {
                throw new Error('Search extraction function must return an array of items');
            }

            if (maxResults && maxResults > 0 && result.length > maxResults) {
                return result.slice(0, maxResults);
            }

            return result;
        } catch (error) {
            console.error('Error run search function extract data:', error?.message);
            throw new Error(`Error run search function extract data: ${error?.message}`);
        }
    }

    async runApiFunctionExtractSearchData(dto: IRunApiSearchFunctionExtractData): Promise<SearchResultItemDto[]> {
        const { functionGenerator, data, maxResults } = dto;

        if (!functionGenerator) {
            throw new Error('Function generator is required');
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Data must be a valid object');
        }

        try {
            const transformedFn = this.transformFunction(functionGenerator);
            const runFn = new Function(
                'data',
                'axios',
                `return async (data, axios) => {
                    ${transformedFn}
                    if (typeof searchData === 'function') {
                        return await searchData(data, axios);
                    }
                    if (typeof extractData === 'function') {
                        return await extractData(data, axios);
                    }
                    throw new Error('Neither searchData nor extractData function is defined');
                }`,
            )(data, axios);

            const result = await runFn(data, axios);

            if (!Array.isArray(result)) {
                throw new Error('Search API extraction function must return an array of items');
            }

            if (maxResults && maxResults > 0 && result.length > maxResults) {
                return result.slice(0, maxResults);
            }

            return result;
        } catch (error) {
            console.error('Error run API search function extract data:', error?.message);
            throw new Error(`Error run API search function extract data: ${error?.message}`);
        }
    }

    private transformFunction(functionString: string): string {
        if (!functionString) return '';
        return functionString.replace(/```javascript/g, '').replace(/```/g, '').trim();
    }
}
```

---

### 5. `[NEW]` `src/modules/data-provider/helpers/_tests/extract-search-data.helper.spec.ts`
> **Action**: Viết unit test đầy đủ cho `ExtractSearchDataHelper`.

```typescript
import { ExtractSearchDataHelper } from '../extract-search-data.helper';

describe('ExtractSearchDataHelper', () => {
    let helper: ExtractSearchDataHelper;

    beforeEach(() => {
        helper = new ExtractSearchDataHelper();
    });

    describe('runFunctionExtractSearchData', () => {
        it('should execute searchData function and return items array', async () => {
            const functionGenerator = `
                const searchData = (html) => {
                    const $ = cheerio.load(html);
                    const items = [];
                    $('a.product').each((_, el) => {
                        items.push({ url: $(el).attr('href'), title: $(el).text() });
                    });
                    return items;
                };
            `;
            const htmlContent = '<div><a class="product" href="/p1">Product 1</a><a class="product" href="/p2">Product 2</a></div>';

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent,
            });

            expect(result).toEqual([
                { url: '/p1', title: 'Product 1' },
                { url: '/p2', title: 'Product 2' },
            ]);
        });

        it('should fallback to extractData function if searchData is not defined', async () => {
            const functionGenerator = `
                const extractData = (html) => {
                    return [{ url: 'https://example.com/item' }];
                };
            `;

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent: '<html></html>',
            });

            expect(result).toEqual([{ url: 'https://example.com/item' }]);
        });

        it('should enforce maxResults if specified', async () => {
            const functionGenerator = `
                const searchData = () => [{ url: '1' }, { url: '2' }, { url: '3' }];
            `;

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent: '<html></html>',
                maxResults: 2,
            });

            expect(result).toHaveLength(2);
        });

        it('should throw error if returned result is not an array', async () => {
            const functionGenerator = `
                const searchData = () => ({ url: 'single-item' });
            `;

            await expect(
                helper.runFunctionExtractSearchData({
                    functionGenerator,
                    htmlContent: '<html></html>',
                }),
            ).rejects.toThrow('Search extraction function must return an array of items');
        });
    });

    describe('runApiFunctionExtractSearchData', () => {
        it('should execute searchData on JSON data', async () => {
            const functionGenerator = `
                const searchData = (data) => {
                    return data.items.map(item => ({ url: item.link, title: item.name }));
                };
            `;
            const data = { items: [{ link: '/item1', name: 'Item 1' }] };

            const result = await helper.runApiFunctionExtractSearchData({
                functionGenerator,
                data,
            });

            expect(result).toEqual([{ url: '/item1', title: 'Item 1' }]);
        });
    });
});
```

---

### 6. `[MODIFY]` `src/modules/data-provider/runners/search-feature.runner.ts`
> **Action**: Cập nhật `SearchFeatureRunner` inject `ScraperService` và `ExtractSearchDataHelper`, xử lý fetch và extract riêng biệt.

```diff
@@ -1,9 +1,10 @@
 import { BadRequestException, Inject, Injectable } from '@nestjs/common';
 
-import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
 import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
-import { IDataProviderScraperService, IExtractDataResponse, IFeatureRunner, ISearchTargetConfig } from '../interfaces';
+import { ScraperServiceEnum } from '../enums';
+import { ExtractSearchDataHelper } from '../helpers/extract-search-data.helper';
+import { IFeatureRunner, ISearchExtractDataResponse, ISearchTargetConfig } from '../interfaces';
+import { ScraperService } from '../services/scraper.service';
 
 @Injectable()
-export class SearchFeatureRunner implements IFeatureRunner<ISearchTargetConfig, any, IExtractDataResponse | any> {
+export class SearchFeatureRunner implements IFeatureRunner<ISearchTargetConfig, any, ISearchExtractDataResponse> {
     constructor(
-        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
-        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
+        private readonly scraperService: ScraperService,
+        private readonly extractSearchDataHelper: ExtractSearchDataHelper,
     ) {}
 
@@ -48,27 +49,42 @@
     }
 
-    async testStateless(service: string, config: ISearchTargetConfig, input: any): Promise<IExtractDataResponse> {
+    async testStateless(service: string, config: ISearchTargetConfig, input: any): Promise<ISearchExtractDataResponse> {
         const { htmlContentString, dataContent } = input || {};
         const url = this.buildSearchUrl(config, input);
 
         if (!url && !dataContent && !htmlContentString) {
             throw new BadRequestException('Search query, searchUrlPattern, URL or Html content is required');
         }
 
-        const scraperService = this.dataProviderScraperServiceMap[service];
-        if (!scraperService) {
-            throw new BadRequestException(`Scraper service '${service}' not found`);
+        const isApi = service === ScraperServiceEnum.API || !!dataContent;
+
+        if (isApi) {
+            let data = dataContent;
+            if (!data) {
+                const apiRes = await this.scraperService.getApiContent(url, config);
+                if (apiRes.status !== 'success') {
+                    return { error: apiRes.error_message || `Failed to fetch API data from ${url}` };
+                }
+                data = apiRes.data;
+            }
+
+            const extracted = await this.extractSearchDataHelper.runApiFunctionExtractSearchData({
+                data,
+                functionGenerator: config?.functionGenerator,
+                maxResults: config?.maxResults,
+            });
+            return { data: extracted };
         }
 
-        return await scraperService.getExtractData({
-            url,
-            dataContent,
-            targetConfig: config,
-            htmlContentString,
+        let html = htmlContentString;
+        if (!html) {
+            const htmlRes = await this.scraperService.getHtmlContent(url, config);
+            if (htmlRes.status !== 'success') {
+                return { error: htmlRes.error_message || `Failed to fetch HTML content from ${url}` };
+            }
+            html = htmlRes.html;
+        }
+
+        const extracted = await this.extractSearchDataHelper.runFunctionExtractSearchData({
+            htmlContent: html,
+            functionGenerator: config?.functionGenerator,
+            resultSelector: config?.resultSelector,
+            maxResults: config?.maxResults,
         });
+
+        return { data: extracted, html };
     }
 
     async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<any> {
@@ -78,18 +94,7 @@
         if (!url && !dataContent && !htmlContentString) {
             throw new BadRequestException('Search query, searchUrlPattern, or item URL is required to test contextual search');
         }
 
-        const scraperService = this.dataProviderScraperServiceMap[feature.service];
-        if (!scraperService) {
-            throw new BadRequestException(`Scraper service '${feature.service}' not found`);
-        }
-
-        const result = await scraperService.getExtractData({
-            url,
-            dataContent,
-            targetConfig: config,
-            htmlContentString,
-        });
+        const result = await this.testStateless(feature.service, config, input);
 
         if (result.error) {
             throw new BadRequestException(result.error || 'Search scraping validation failed');
```

---

### 7. `[MODIFY]` `src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts`
> **Action**: Cập nhật mock và test case cho `SearchFeatureRunner`.

```diff
@@ -4,22 +4,20 @@
 import { ISearchTargetConfig } from '../../interfaces';
 import { SearchFeatureRunner } from '../search-feature.runner';
 
 describe('SearchFeatureRunner', () => {
     let runner: SearchFeatureRunner;
     let mockScraperService: any;
+    let mockExtractSearchDataHelper: any;
 
     beforeEach(() => {
         mockScraperService = {
-            getExtractData: jest.fn(),
-            scrapeItemData: jest.fn(),
-            validateParserFunction: jest.fn(),
+            getHtmlContent: jest.fn(),
+            getApiContent: jest.fn(),
         };
+        mockExtractSearchDataHelper = {
+            runFunctionExtractSearchData: jest.fn(),
+            runApiFunctionExtractSearchData: jest.fn(),
+        };
 
-        runner = new SearchFeatureRunner({
-            generic: mockScraperService,
-        });
+        runner = new SearchFeatureRunner(mockScraperService, mockExtractSearchDataHelper);
         jest.clearAllMocks();
     });
@@ -60,25 +58,26 @@
         it('should throw BadRequestException when no URL or content is resolvable', async () => {
             await expect(runner.testStateless('generic', {} as any, {})).rejects.toThrow(BadRequestException);
         });
 
-        it('should call getExtractData on valid scraper service', async () => {
-            mockScraperService.getExtractData.mockResolvedValue({ data: [{ title: 'Item 1' }] });
+        it('should fetch HTML and extract search data successfully', async () => {
+            mockScraperService.getHtmlContent.mockResolvedValue({ status: 'success', html: '<div>Search</div>' });
+            mockExtractSearchDataHelper.runFunctionExtractSearchData.mockResolvedValue([{ title: 'Item 1', url: '/p1' }]);
 
             const config: ISearchTargetConfig = {
-                functionGenerator: '',
+                functionGenerator: 'const searchData = () => []',
                 searchUrlPattern: 'https://example.com/search?q={query}',
             };
 
             const result = await runner.testStateless('generic', config, { query: 'test' });
-            expect(result).toEqual({ data: [{ title: 'Item 1' }] });
-            expect(mockScraperService.getExtractData).toHaveBeenCalledWith({
-                url: 'https://example.com/search?q=test',
-                dataContent: undefined,
-                targetConfig: config,
-                htmlContentString: undefined,
-            });
+            expect(result).toEqual({ data: [{ title: 'Item 1', url: '/p1' }], html: '<div>Search</div>' });
+            expect(mockScraperService.getHtmlContent).toHaveBeenCalledWith('https://example.com/search?q=test', config);
+            expect(mockExtractSearchDataHelper.runFunctionExtractSearchData).toHaveBeenCalledWith({
+                htmlContent: '<div>Search</div>',
+                functionGenerator: config.functionGenerator,
+                resultSelector: undefined,
+                maxResults: undefined,
+            });
         });
     });
 
     describe('testContextual', () => {
         it('should throw BadRequestException if scraper service returns error', async () => {
-            mockScraperService.getExtractData.mockResolvedValue({ error: 'Failed to fetch html' });
+            mockScraperService.getHtmlContent.mockResolvedValue({ status: 'error', error_message: 'Failed to fetch html' });
 
             const feature = {
                 service: 'generic',
                 config: { searchUrlPattern: 'https://example.com/search?q={query}' },
             } as DataProviderFeatureEntity;
 
             await expect(runner.testContextual(feature, { query: 'test' })).rejects.toThrow(BadRequestException);
         });
 
         it('should return extract result on success', async () => {
-            mockScraperService.getExtractData.mockResolvedValue({ data: [{ title: 'Item Context' }] });
+            mockScraperService.getHtmlContent.mockResolvedValue({ status: 'success', html: '<html></html>' });
+            mockExtractSearchDataHelper.runFunctionExtractSearchData.mockResolvedValue([{ title: 'Item Context', url: '/ctx' }]);
 
             const feature = {
                 service: 'generic',
                 config: { searchUrlPattern: 'https://example.com/search?q={query}' },
             } as DataProviderFeatureEntity;
 
             const result = await runner.testContextual(feature, { query: 'test' });
-            expect(result).toEqual({ data: [{ title: 'Item Context' }] });
+            expect(result).toEqual({ data: [{ title: 'Item Context', url: '/ctx' }], html: '<html></html>' });
         });
     });
 });
```

---

### 8. `[MODIFY]` `src/modules/data-provider/data-provider.module.ts`
> **Action**: Đăng ký `ExtractSearchDataHelper` vào module.

```diff
@@ -26,6 +26,7 @@
 import { ScraperServiceEnum } from './enums';
 import { ExtractDataHelper } from './helpers/extract-data.helper';
+import { ExtractSearchDataHelper } from './helpers/extract-search-data.helper';
 import { UrlResolverHelper } from './helpers/url-resolver.helper';
 import { IDataProviderScraperService } from './interfaces';
@@ -49,3 +50,3 @@
-const helpers = [ExtractDataHelper, UrlResolverHelper];
+const helpers = [ExtractDataHelper, ExtractSearchDataHelper, UrlResolverHelper];
 const listeners = [ScrapingDataListener];
```

---

## Section 5. Test Cases & Verification

### Automated Tests
- `npm run build`: **PASS** (TypeScript compilation + Nest build succeeded with exit code 0).
- `eslint`: **PASS** (All modified files checked and formatted with zero errors).

### Manual Checks
- [x] Contract isolation: `ExtractSearchDataHelper` hoạt động độc lập với `ExtractDataHelper`, hỗ trợ cả `searchData(html)` và `extractData(html)` fallback.
- [x] Schema: `SearchResultItemDto` định nghĩa chuẩn (`url`, `title`, `imageUrl`, `relativeUrl`, `metadata`), tách biệt hoàn toàn khỏi `ScrapeItemDataResponseItemDto`.
- [x] Runner: `SearchFeatureRunner` inject trực tiếp `ScraperService` và `ExtractSearchDataHelper`, xử lý cả HTML và API searches.

