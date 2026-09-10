---
status: done
slug: verify-data-provider-feature-config
started_at: 2026-09-10
completed_at: 2026-09-10
pr_url: ~
branch: ~
---

# Plan: Cơ Chế Xác Thực Cấu Hình Tính Năng & Chuẩn Hóa Kiểu Dữ Liệu Data Provider Feature (IScrapingTargetConfig & ISearchTargetConfig)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại & Điểm nghẽn**:
  - DTOs đầu vào (`CreateDataProviderFeatureRequestDto.config`, `UpdateFeatureConfigRequestDto.config`, `TestFeatureStatelessRequestDto.config`) đang sử dụng kiểu lỏng lẻo `Record<string, unknown>`.
  - [data-provider-feature.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts) và [config-version.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/config-version.entity.ts) định nghĩa trường `config` là `Record<string, any>`, làm mất tính type-safety tại tầng domain và ORM.
  - Tên interface cũ `ITargetConfig` mang tính chung chung không rõ ràng cho Scraping, trong khi `ISearchTargetConfig` đã tách riêng.
  - Lạm dụng kiểu `any` trong `IFeatureRunner` (`TConfig = any, TInput = any, TResult = any`), `ScrapingFeatureRunner`, `SearchFeatureRunner`, `ExtractSearchDataHelper`, `ExtractDataHelper`, `DataProviderFeatureController`.
  - [data-provider-feature.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts) lưu trực tiếp payload `config` vào database mà không qua bất kỳ lớp kiểm tra schema hoặc cú pháp code nào nếu client không truyền kèm `input`.
- **Invariants bắt buộc bảo toàn**:
  - Đổi tên `ITargetConfig` thành `IScrapingTargetConfig` và giữ `ISearchTargetConfig extends IScrapingTargetConfig`, dùng `TargetConfig = IScrapingTargetConfig | ISearchTargetConfig` cho polymorphic contexts.
  - **Triệt tiêu 100% kiểu `any`** trong toàn bộ hợp đồng type, entity, runner, DTOs và helper của DataProvider Feature.
  - Runner Strategy Pattern thông qua `FeatureRunnerRegistry`.
  - Cột `config` trong database PostgreSQL giữ nguyên kiểu dữ liệu `jsonb`.
  - Khả năng tạo feature ở trạng thái `UNCONFIGURED` khi không truyền `config` hoặc `input`.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

- **Type Signatures & Code Contracts**:
  - Định nghĩa `IScrapingTargetConfig`, `ISearchTargetConfig`, `TargetConfig` và `FeatureTestInput` trong [target-config.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts):
    ```ts
    export interface CookieItem {
        name: string;
        value: string;
        domain?: string;
        path?: string;
    }

    export interface IScrapingTargetConfig {
        functionGenerator: string; // Hàm xử lý dữ liệu

        mainContentSelector?: string; // Selector lấy nội dung chính
        isGetParentElement?: boolean; // Lấy phần tử cha của nội dung chính

        queryParams?: string; // Tham số truyền vào API
        firstQueryParams?: string; // Tham số truyền vào API

        maxResults?: number; // Số lượng kết quả tối đa
        retryDelay?: number; // Thời gian delay giữa mỗi lần retry (ms)
        retryAttempts?: number; // Số lần thử lại khi có lỗi
        userAgent?: string; // Chuỗi user-agent giả lập cho trình duyệt
        headers?: Record<string, string>; // Các header HTTP bổ sung khi request
        cookies?: Array<CookieItem>; // Các cookie bổ sung khi truy cập trang

        timeout?: number; // Thời gian chờ tối đa cho mỗi request (ms)
        waitForTimeout?: number; // Thời gian chờ tối đa cho waitForSelector (ms)

        stealthMode?: boolean; // Bật chế độ ẩn danh chống bot
        cloudflareBypass?: boolean; // Bật chế độ vượt qua Cloudflare
        waitForSelector?: string; // Chờ selector này xuất hiện trước khi lấy nội dung
        javascriptEnabled?: boolean; // Có bật JavaScript hay không
        imagesEnabled?: boolean; // Có tải ảnh hay không
        cssEnabled?: boolean; // Có tải CSS hay không
    }

    export interface ISearchTargetConfig extends IScrapingTargetConfig {
        searchUrlPattern?: string; // Pattern URL tìm kiếm (e.g. https://example.com/search?q={query})
        queryPlaceholder?: string; // Placeholder thay thế query trong searchUrlPattern (e.g. {query})
        resultSelector?: string; // Selector của từng thẻ sản phẩm/kết quả trong danh sách
    }

    export type TargetConfig = IScrapingTargetConfig | ISearchTargetConfig;

    export interface FeatureTestInput {
        url?: string;
        htmlContentString?: string;
        dataContent?: Record<string, unknown>;
        query?: string;
        itemUrl?: string;
        [key: string]: unknown;
    }
    ```
  - Mở rộng `IFeatureRunner` trong [feature-runner.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/feature-runner.interface.ts):
    ```ts
    export interface IFeatureRunner<TConfig = TargetConfig, TInput = FeatureTestInput, TResult = unknown> {
        validateConfig(config: unknown): TConfig;
        testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
        testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
    }
    ```
  - Định nghĩa Error Factory trong [data-provider-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/constants/data-provider-error.ts):
    ```ts
    static InvalidFeatureConfig = (reason: string): IAppError => ({
        code: 'data_provider_invalid_feature_config',
        message: `Cấu hình tính năng không hợp lệ: ${reason}`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { reason },
    });
    ```
  - Xây dựng `TargetConfigValidatorHelper` trong [target-config-validator.helper.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/target-config-validator.helper.ts):
    - `validateScrapingTargetConfig(rawConfig: unknown): IScrapingTargetConfig`
    - `validateSearchTargetConfig(rawConfig: unknown): ISearchTargetConfig`
    - `validateConfig(rawConfig: unknown, type: DataProviderFeatureType): TargetConfig`

- **AST Seams & Callers**:
  - `ScrapingFeatureRunner.validateConfig` & `testStateless` trong [scraping-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/scraping-feature.runner.ts#L19).
  - `SearchFeatureRunner.validateConfig` & `testStateless` trong [search-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts#L53).
  - `DataProviderFeatureController.testStateless` trong [data-provider-feature.controller.ts#L59](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts#L59).
  - `DataProviderFeatureService.createFeature` ([data-provider-feature.service.ts#L38-L58](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts#L38-L58)) và `updateFeatureConfig` ([data-provider-feature.service.ts#L60-L95](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts#L60-L95)).

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── constants/
│   └── [MODIFY] data-provider-error.ts                              # Thêm mã lỗi InvalidFeatureConfig
├── controllers/
│   └── [MODIFY] data-provider-feature.controller.ts                 # Loại bỏ Promise<any> tại testStateless
├── dtos/
│   ├── [MODIFY] config-version.dto.ts                               # Đổi type config -> TargetConfig
│   ├── [MODIFY] data-provider-feature.dto.ts                        # Đổi type config -> TargetConfig
│   ├── requests/
│   │   ├── [MODIFY] config-version-request.dto.ts                   # Đổi type config -> TargetConfig
│   │   └── [MODIFY] data-provider-feature-request.dto.ts            # Đổi config -> TargetConfig, input -> FeatureTestInput
│   └── responses/
│       └── [MODIFY] scrape-item-data-response.dto.ts                # Đổi ITargetConfig -> IScrapingTargetConfig
├── entities/
│   ├── [MODIFY] config-version.entity.ts                            # Đổi type config -> TargetConfig
│   └── [MODIFY] data-provider-feature.entity.ts                     # Đổi type config -> TargetConfig
├── helpers/
│   ├── [NEW]    target-config-validator.helper.ts                   # Helper xác thực schema và JS syntax (Zero any)
│   └── _tests/
│       └── [NEW] target-config-validator.helper.spec.ts             # Unit tests cho helper xác thực
├── interfaces/
│   ├── [MODIFY] data-provider-scraper-service.interface.ts          # Đổi ITargetConfig -> IScrapingTargetConfig
│   ├── [MODIFY] data-provider-search-service.interface.ts           # Đổi data -> Record<string, unknown>
│   ├── [MODIFY] discovery-runner.interface.ts                       # Đổi ITargetConfig -> IScrapingTargetConfig
│   ├── [MODIFY] feature-runner.interface.ts                         # Loại bỏ any generics, dùng TargetConfig & FeatureTestInput
│   └── [MODIFY] target-config.interface.ts                          # IScrapingTargetConfig, ISearchTargetConfig, TargetConfig, FeatureTestInput
├── runners/
│   ├── [MODIFY] discovery.runner.ts                                 # Đổi ITargetConfig -> IScrapingTargetConfig
│   ├── [MODIFY] scraping-feature.runner.ts                          # IFeatureRunner<IScrapingTargetConfig, ...>
│   └── [MODIFY] search-feature.runner.ts                            # IFeatureRunner<ISearchTargetConfig, ...>
└── services/
    ├── [MODIFY] data-provider-feature.service.ts                    # Gọi validateConfig trong create/update
    ├── [MODIFY] data-provider-scraper.service.ts                    # Đổi ITargetConfig -> IScrapingTargetConfig
    └── data-provider-scraper/
        ├── [MODIFY] api-data-provider-scraper.service.ts            # Đổi ITargetConfig -> IScrapingTargetConfig
        ├── [MODIFY] generic-data-provider-scraper.service.ts        # Đổi ITargetConfig -> IScrapingTargetConfig
        └── [MODIFY] local-data-provider-scraper.service.ts          # Đổi ITargetConfig -> IScrapingTargetConfig
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/constants/data-provider-error.ts` | `DataProviderError.InvalidFeatureConfig` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/target-config.interface.ts` | `IScrapingTargetConfig, ISearchTargetConfig, TargetConfig, FeatureTestInput` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/feature-runner.interface.ts` | `IFeatureRunner` (Zero any) | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/data-provider-scraper-service.interface.ts` | `IGetExtractDataRequest, IValidateParserFunctionRequest` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/data-provider-search-service.interface.ts` | `IGetExtractSearchDataRequest` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/discovery-runner.interface.ts` | `IRunDiscoveryParams` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **7** | `[x]` | `[NEW]` | `src/modules/data-provider/helpers/target-config-validator.helper.ts` | `TargetConfigValidatorHelper` (Zero any) | `Order 1, 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **8** | `[x]` | `[NEW]` | `src/modules/data-provider/helpers/_tests/target-config-validator.helper.spec.ts` | `TargetConfigValidatorHelper Unit Tests` | `Order 7` | `npx tsc -p tsconfig.build.json --noEmit` |
| **9** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/scraping-feature.runner.ts` | `ScrapingFeatureRunner` (IScrapingTargetConfig) | `Order 3, 7` | `npx tsc -p tsconfig.build.json --noEmit` |
| **10** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/search-feature.runner.ts` | `SearchFeatureRunner` (ISearchTargetConfig) | `Order 3, 7` | `npx tsc -p tsconfig.build.json --noEmit` |
| **11** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/discovery.runner.ts` | `DiscoveryRunner.fetchHtml` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **12** | `[x]` | `[MODIFY]` | `src/modules/data-provider/entities/data-provider-feature.entity.ts` | `DataProviderFeatureEntity.config` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **13** | `[x]` | `[MODIFY]` | `src/modules/data-provider/entities/config-version.entity.ts` | `ConfigVersionEntity.config` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **14** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/data-provider-feature.dto.ts` | `DataProviderFeatureDto.config` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **15** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/config-version.dto.ts` | `ConfigVersionDto.config` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **16** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts` | `*RequestDto.config, input` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **17** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/requests/config-version-request.dto.ts` | `CreateConfigVersionRequestDto.config` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **18** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/responses/scrape-item-data-response.dto.ts` | `ScrapeItemDataResponseDto.request` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **19** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider-feature.controller.ts` | `DataProviderFeatureController.testStateless` (Typed return) | `Order 2, 9, 10` | `npx tsc -p tsconfig.build.json --noEmit` |
| **20** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-scraper.service.ts` | `DataProviderScraperService` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **21** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-scraper/*.ts` | `Local/Generic/Api DataProviderScraperService` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **22** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-feature.service.ts` | `DataProviderFeatureService.createFeature, updateFeatureConfig` | `Order 3, 9, 10, 12` | `npx tsc -p tsconfig.build.json --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/constants/data-provider-error.ts`
> **Action**: Thêm error factory `InvalidFeatureConfig` vào từ điển lỗi `DataProviderError`.

```diff
@@ line 170 @@
     static FeatureValidationFailed = (error: string): IAppError => ({
         code: 'data_provider_feature_validation_failed',
         message: `Xác thực tính năng thất bại: ${error}`,
         statusCode: HttpStatus.BAD_REQUEST,
         params: { error },
     });
+
+    static InvalidFeatureConfig = (reason: string): IAppError => ({
+        code: 'data_provider_invalid_feature_config',
+        message: `Cấu hình tính năng không hợp lệ: ${reason}`,
+        statusCode: HttpStatus.BAD_REQUEST,
+        params: { reason },
+    });

     static ConfigVersionNotFound = (versionId: number | string, featureId?: string): IAppError => ({
```

---

### 2. `[MODIFY]` `src/modules/data-provider/interfaces/target-config.interface.ts`
> **Action**: Đổi tên `ITargetConfig` thành `IScrapingTargetConfig`, giữ `ISearchTargetConfig`, khai báo `TargetConfig` và `FeatureTestInput`, loại bỏ toàn bộ `any`.

```diff
@@ line 1 @@
 import { SearchResultItemDto } from '../dtos/responses/search-extract-data-response.dto';

+export interface CookieItem {
+    name: string; // Tên cookie
+    value: string; // Giá trị cookie
+    domain?: string; // Domain áp dụng cookie
+    path?: string; // Đường dẫn áp dụng cookie
+}
+
-export interface ITargetConfig {
+export interface IScrapingTargetConfig {
     functionGenerator: string; //  Hàm xử lý dữ liệu

     mainContentSelector?: string; // Selector lấy nội dung chính
     isGetParentElement?: boolean; // Lấy phần tử cha của nội dung chính

     queryParams?: string; //  Tham số truyền vào API
     firstQueryParams?: string; //  Tham số truyền vào API

     maxResults?: number; // Số lượng kết quả tối đa
     retryDelay?: number; // Thời gian delay giữa mỗi lần retry (ms)
     retryAttempts?: number; // Số lần thử lại khi có lỗi
     userAgent?: string; // Chuỗi user-agent giả lập cho trình duyệt
     headers?: Record<string, string>; // Các header HTTP bổ sung khi request
-    cookies?: Array<{
-        // Các cookie bổ sung khi truy cập trang
-        name: string; // Tên cookie
-        value: string; // Giá trị cookie
-        domain?: string; // Domain áp dụng cookie
-        path?: string; // Đường dẫn áp dụng cookie
-    }>; // Các cookie bổ sung khi truy cập trang
+    cookies?: Array<CookieItem>; // Các cookie bổ sung khi truy cập trang

     timeout?: number; // Thời gian chờ tối đa cho mỗi request (ms)
     waitForTimeout?: number; // Thời gian chờ tối đa cho waitForSelector (ms)

     stealthMode?: boolean; // Bật chế độ ẩn danh chống bot
     cloudflareBypass?: boolean; // Bật chế độ vượt qua Cloudflare
     waitForSelector?: string; // Chờ selector này xuất hiện trước khi lấy nội dung
     javascriptEnabled?: boolean; // Có bật JavaScript hay không
     imagesEnabled?: boolean; // Có tải ảnh hay không
     cssEnabled?: boolean; // Có tải CSS hay không
 }

-export interface ISearchTargetConfig extends ITargetConfig {
+export interface ISearchTargetConfig extends IScrapingTargetConfig {
     searchUrlPattern?: string; // Pattern URL tìm kiếm (e.g. https://example.com/search?q={query})
     queryPlaceholder?: string; // Placeholder thay thế query trong searchUrlPattern (e.g. {query})
     resultSelector?: string; // Selector của từng thẻ sản phẩm/kết quả trong danh sách
 }

+export type TargetConfig = IScrapingTargetConfig | ISearchTargetConfig;
+
+export interface FeatureTestInput {
+    url?: string;
+    htmlContentString?: string;
+    dataContent?: Record<string, unknown>;
+    query?: string;
+    itemUrl?: string;
+    [key: string]: unknown;
+}
+
 export interface IRunFunctionExtractData {
@@ line 49 @@
 export interface IRunApiFunctionExtractData {
-    data: Record<string, any>;
+    data: Record<string, unknown>;
     functionGenerator: string;
 }

 export interface IRunSearchFunctionExtractData {
@@ line 63 @@
 export interface IRunApiSearchFunctionExtractData {
-    data: Record<string, any>;
+    data: Record<string, unknown>;
     functionGenerator: string;
     maxResults?: number;
 }
```

---

### 3. `[MODIFY]` `src/modules/data-provider/interfaces/feature-runner.interface.ts`
> **Action**: Loại bỏ `any` trong `IFeatureRunner`, dùng `TargetConfig` và `FeatureTestInput`.

```diff
@@ line 1 @@
 import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
 import { ScraperServiceEnum } from '../enums';
+import { FeatureTestInput, TargetConfig } from './target-config.interface';

-export interface IFeatureRunner<TConfig = any, TInput = any, TResult = any> {
+export interface IFeatureRunner<TConfig = TargetConfig, TInput = FeatureTestInput, TResult = unknown> {
+    validateConfig(config: unknown): TConfig;
     testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
     testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
 }
```

---

### 4. `[MODIFY]` `src/modules/data-provider/interfaces/data-provider-scraper-service.interface.ts`
> **Action**: Thay thế `ITargetConfig` bằng `IScrapingTargetConfig` và `Record<string, any>` bằng `Record<string, unknown>`.

```diff
@@ line 5 @@
-import { ITargetConfig } from './target-config.interface';
+import { IScrapingTargetConfig } from './target-config.interface';

 export interface IGetExtractDataRequest {
     url: string;
-    targetConfig: ITargetConfig;
+    targetConfig: IScrapingTargetConfig;
     lastScrapedTimestamp?: Date;
     htmlContentString?: string;
-    dataContent?: Record<string, any>;
+    dataContent?: Record<string, unknown>;
 }
@@ line 26 @@
 export interface IValidateParserFunctionRequest {
-    targetConfig: ITargetConfig;
+    targetConfig: IScrapingTargetConfig;
     productUrl?: string;
 }
```

---

### 5. `[MODIFY]` `src/modules/data-provider/interfaces/data-provider-search-service.interface.ts`
> **Action**: Thay thế `Record<string, any>` bằng `Record<string, unknown>`.

```diff
@@ line 7 @@
 export interface IGetExtractSearchDataRequest {
     url: string;
     targetConfig: ISearchTargetConfig;
     htmlContentString?: string;
-    dataContent?: Record<string, any>;
+    dataContent?: Record<string, unknown>;
 }
```

---

### 6. `[MODIFY]` `src/modules/data-provider/interfaces/discovery-runner.interface.ts`
> **Action**: Thay thế `ITargetConfig` bằng `IScrapingTargetConfig`.

```diff
@@ line 2 @@
-import { ITargetConfig } from './target-config.interface';
+import { IScrapingTargetConfig } from './target-config.interface';
@@ line 22 @@
 export interface IRunDiscoveryParams {
     session: DiscoverySessionEntity;
-    targetConfig?: ITargetConfig;
+    targetConfig?: IScrapingTargetConfig;
     targetKeyword?: string;
 }
```

---

### 7. `[NEW]` `src/modules/data-provider/helpers/target-config-validator.helper.ts`
> **Action**: Xây dựng helper kiểm tra tính toàn vẹn cấu trúc và cú pháp JavaScript cho `IScrapingTargetConfig` và `ISearchTargetConfig` (Zero any).

```ts
import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
import { DataProviderFeatureType } from '../enums/data-provider-feature-type.enum';
import { IScrapingTargetConfig, ISearchTargetConfig, TargetConfig } from '../interfaces/target-config.interface';

export class TargetConfigValidatorHelper {
    public static validateScrapingTargetConfig(rawConfig: unknown): IScrapingTargetConfig {
        if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('Cấu hình tính năng bắt buộc phải là một đối tượng JSON.'));
        }

        const config = rawConfig as Partial<IScrapingTargetConfig>;

        if (!config.functionGenerator || typeof config.functionGenerator !== 'string' || !config.functionGenerator.trim()) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('Trường functionGenerator là bắt buộc và không được để trống.'));
        }

        try {
            new Function('html', 'cheerio', 'axios', config.functionGenerator);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new AppException(
                DataProviderError.InvalidFeatureConfig(`Cú pháp hàm functionGenerator không hợp lệ: ${message}`),
            );
        }

        if (config.retryAttempts !== undefined && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('retryAttempts phải là số nguyên không âm.'));
        }

        if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('retryDelay phải là số không âm.'));
        }

        if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('timeout phải là số dương (> 0).'));
        }

        if (config.waitForTimeout !== undefined && (typeof config.waitForTimeout !== 'number' || config.waitForTimeout < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('waitForTimeout phải là số không âm.'));
        }

        if (config.cookies !== undefined) {
            if (!Array.isArray(config.cookies)) {
                throw new AppException(DataProviderError.InvalidFeatureConfig('cookies phải là một mảng.'));
            }
            for (let i = 0; i < config.cookies.length; i++) {
                const cookie = config.cookies[i];
                if (!cookie || typeof cookie !== 'object' || !cookie.name || !cookie.value) {
                    throw new AppException(DataProviderError.InvalidFeatureConfig(`Cookie tại vị trí ${i} phải có đầy đủ name và value.`));
                }
            }
        }

        if (config.headers !== undefined && (typeof config.headers !== 'object' || Array.isArray(config.headers))) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('headers phải là một đối tượng key-value.'));
        }

        return config as IScrapingTargetConfig;
    }

    public static validateSearchTargetConfig(rawConfig: unknown): ISearchTargetConfig {
        const baseConfig = this.validateScrapingTargetConfig(rawConfig);
        const searchConfig = rawConfig as Partial<ISearchTargetConfig>;

        if (searchConfig.searchUrlPattern !== undefined && typeof searchConfig.searchUrlPattern !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('searchUrlPattern phải là chuỗi ký tự.'));
        }

        if (searchConfig.queryPlaceholder !== undefined && typeof searchConfig.queryPlaceholder !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('queryPlaceholder phải là chuỗi ký tự.'));
        }

        if (searchConfig.resultSelector !== undefined && typeof searchConfig.resultSelector !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('resultSelector phải là chuỗi ký tự.'));
        }

        return {
            ...baseConfig,
            searchUrlPattern: searchConfig.searchUrlPattern,
            queryPlaceholder: searchConfig.queryPlaceholder,
            resultSelector: searchConfig.resultSelector,
        };
    }

    public static validateConfig(rawConfig: unknown, type: DataProviderFeatureType): TargetConfig {
        if (type === DataProviderFeatureType.SEARCH) {
            return this.validateSearchTargetConfig(rawConfig);
        }

        return this.validateScrapingTargetConfig(rawConfig);
    }
}
```

---

### 8. `[NEW]` `src/modules/data-provider/helpers/_tests/target-config-validator.helper.spec.ts`
> **Action**: Khởi tạo bộ test unit kiểm thử toàn diện các trường hợp validation hợp lệ và biên lỗi của helper.

```ts
import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderFeatureType } from '../../enums/data-provider-feature-type.enum';
import { IScrapingTargetConfig, ISearchTargetConfig } from '../../interfaces/target-config.interface';
import { TargetConfigValidatorHelper } from '../target-config-validator.helper';

describe('TargetConfigValidatorHelper', () => {
    describe('validateScrapingTargetConfig', () => {
        it('should throw error when rawConfig is not an object', () => {
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig(null)).toThrow(AppException);
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig('string')).toThrow(AppException);
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig([])).toThrow(AppException);
        });

        it('should throw error when functionGenerator is missing or empty', () => {
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig({})).toThrow(AppException);
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig({ functionGenerator: '   ' })).toThrow(AppException);
        });

        it('should throw error when functionGenerator has syntax error', () => {
            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'const a = {;',
                }),
            ).toThrow(AppException);
        });

        it('should throw error when numeric options are invalid', () => {
            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'return {};',
                    timeout: -100,
                }),
            ).toThrow(AppException);

            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'return {};',
                    retryAttempts: -1,
                }),
            ).toThrow(AppException);
        });

        it('should throw error when cookies contain invalid elements', () => {
            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'return {};',
                    cookies: [{ name: 'test' }] as unknown as IScrapingTargetConfig['cookies'],
                }),
            ).toThrow(AppException);
        });

        it('should return validated IScrapingTargetConfig on success', () => {
            const config: IScrapingTargetConfig = {
                functionGenerator: 'return { title: "sample" };',
                timeout: 5000,
                retryAttempts: 2,
                cookies: [{ name: 'token', value: 'xyz' }],
            };
            const result = TargetConfigValidatorHelper.validateScrapingTargetConfig(config);
            expect(result).toEqual(config);
        });
    });

    describe('validateSearchTargetConfig', () => {
        it('should validate search specific fields', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: 'return [];',
                searchUrlPattern: 'https://example.com/search?q={query}',
                queryPlaceholder: '{query}',
                resultSelector: '.item',
            };
            const result = TargetConfigValidatorHelper.validateSearchTargetConfig(config);
            expect(result.searchUrlPattern).toBe('https://example.com/search?q={query}');
            expect(result.queryPlaceholder).toBe('{query}');
        });
    });

    describe('validateConfig by type', () => {
        it('should route to search validator when type is SEARCH', () => {
            const config = {
                functionGenerator: 'return [];',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };
            const result = TargetConfigValidatorHelper.validateConfig(config, DataProviderFeatureType.SEARCH);
            expect((result as ISearchTargetConfig).searchUrlPattern).toBe('https://example.com/search?q={query}');
        });
    });
});
```

---

### 9. `[MODIFY]` `src/modules/data-provider/runners/scraping-feature.runner.ts`
> **Action**: Triển khai `validateConfig` (trả về `IScrapingTargetConfig`) và thay thế toàn bộ kiểu `any`.

```diff
@@ line 1 @@
 import { forwardRef, Inject, Injectable } from '@nestjs/common';

 import { AppException } from '../../../exceptions/app.exception';
+import { ValidateParserFunctionResponseDto } from '../dtos/responses';
 import { DataProviderError } from '../constants/data-provider-error';
 import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
 import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
-import { IDataProviderScraperService, IExtractDataResponse, IFeatureRunner, ITargetConfig } from '../interfaces';
+import { FeatureTestInput, IDataProviderScraperService, IExtractDataResponse, IFeatureRunner, IScrapingTargetConfig } from '../interfaces';
+import { TargetConfigValidatorHelper } from '../helpers/target-config-validator.helper';
 import { DataProviderItemService } from '../services/data-provider-item.service';
+import { ScraperServiceEnum } from '../enums';

 @Injectable()
-export class ScrapingFeatureRunner implements IFeatureRunner<ITargetConfig, any, IExtractDataResponse | any> {
+export class ScrapingFeatureRunner implements IFeatureRunner<IScrapingTargetConfig, FeatureTestInput, IExtractDataResponse | ValidateParserFunctionResponseDto> {
     constructor(
         @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
         private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
         @Inject(forwardRef(() => DataProviderItemService))
         private readonly dataProviderItemService: DataProviderItemService,
     ) {}

+    validateConfig(config: unknown): IScrapingTargetConfig {
+        return TargetConfigValidatorHelper.validateScrapingTargetConfig(config);
+    }
+
-    async testStateless(service: string, config: ITargetConfig, input: any): Promise<IExtractDataResponse> {
+    async testStateless(service: ScraperServiceEnum | string, config: IScrapingTargetConfig, input: FeatureTestInput): Promise<IExtractDataResponse> {
         const targetConfig = this.validateConfig(config);
         const { url, dataContent, htmlContentString } = input || {};
         if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingTestInput);

         const scraperService = this.dataProviderScraperServiceMap[service];
         if (!scraperService) throw new AppException(DataProviderError.ScraperServiceNotFound(service));

         const result = await scraperService.getExtractData({
             url: url || '',
             dataContent,
             htmlContentString,
-            targetConfig: config,
+            targetConfig,
         });
         if (result.error) throw new AppException(DataProviderError.FeatureTestFailed(result.error));

         return result;
     }

-    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<any> {
+    async testContextual(feature: DataProviderFeatureEntity, input?: FeatureTestInput): Promise<ValidateParserFunctionResponseDto> {
         let itemUrl = input?.itemUrl || input?.url;
         if (!itemUrl) {
             const randomItem = await this.dataProviderItemService.findOneByFilterAndOptions(
                 { dataProviderId: feature.dataProviderId },
                 { isRandom: true },
             );
             if (!randomItem) throw new AppException(DataProviderError.NoSampleItemFound);

             itemUrl = randomItem.itemUrl;
         }

         const scraperService = this.dataProviderScraperServiceMap[feature.service];
         if (!scraperService) throw new AppException(DataProviderError.ScraperServiceNotFound(feature.service));

         const result = await scraperService.validateParserFunction({
             productUrl: itemUrl,
-            targetConfig: feature.config as ITargetConfig,
+            targetConfig: feature.config as IScrapingTargetConfig,
         });

         if (result.status !== 'success') {
             throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Scraping validation failed'));
         }

         return result;
     }
```

---

### 10. `[MODIFY]` `src/modules/data-provider/runners/search-feature.runner.ts`
> **Action**: Triển khai `validateConfig` (trả về `ISearchTargetConfig`) và thay thế toàn bộ kiểu `any`.

```diff
@@ line 1 @@
 import { Inject, Injectable } from '@nestjs/common';

 import { AppException } from '../../../exceptions/app.exception';
+import { ScraperServiceEnum } from '../enums';
 import { DataProviderError } from '../constants/data-provider-error';
 import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
 import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
-import { IDataProviderSearchService, IFeatureRunner, ISearchExtractDataResponse, ISearchTargetConfig } from '../interfaces';
+import { FeatureTestInput, IDataProviderSearchService, IFeatureRunner, ISearchExtractDataResponse, ISearchTargetConfig } from '../interfaces';
+import { TargetConfigValidatorHelper } from '../helpers/target-config-validator.helper';

 @Injectable()
-export class SearchFeatureRunner implements IFeatureRunner<ISearchTargetConfig, any, ISearchExtractDataResponse> {
+export class SearchFeatureRunner implements IFeatureRunner<ISearchTargetConfig, FeatureTestInput, ISearchExtractDataResponse> {
     constructor(
         @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
         private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
     ) {}

+    validateConfig(config: unknown): ISearchTargetConfig {
+        return TargetConfigValidatorHelper.validateSearchTargetConfig(config);
+    }
+
-    buildSearchUrl(config: ISearchTargetConfig, input?: any): string {
+    buildSearchUrl(config: ISearchTargetConfig, input?: FeatureTestInput): string {
@@ line 53 @@
-    async testStateless(service: string, config: ISearchTargetConfig, input: any): Promise<ISearchExtractDataResponse> {
+    async testStateless(service: ScraperServiceEnum | string, config: ISearchTargetConfig, input: FeatureTestInput): Promise<ISearchExtractDataResponse> {
         const targetConfig = this.validateConfig(config);
         const { htmlContentString, dataContent } = input || {};

-        const url = this.buildSearchUrl(config, input);
+        const url = this.buildSearchUrl(targetConfig, input);
         if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingSearchTestInput);

         const searchService = this.dataProviderSearchServiceMap[service];
         if (!searchService) throw new AppException(DataProviderError.SearchServiceNotFound(service));

         const result = await searchService.getExtractSearchData({
             url,
             dataContent,
             htmlContentString,
-            targetConfig: config,
+            targetConfig,
         });
         if (result.error) throw new AppException(DataProviderError.FeatureTestFailed(result.error));

         return result;
     }

-    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<ISearchExtractDataResponse> {
+    async testContextual(feature: DataProviderFeatureEntity, input?: FeatureTestInput): Promise<ISearchExtractDataResponse> {
         const { htmlContentString, dataContent } = input || {};

         const config = (feature.config || {}) as ISearchTargetConfig;
         const url = this.buildSearchUrl(config, input);
         if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingSearchTestInput);

         const searchService = this.dataProviderSearchServiceMap[feature.service];
         if (!searchService) throw new AppException(DataProviderError.SearchServiceNotFound(feature.service));

         const result = await searchService.getExtractSearchData({
             url,
             dataContent,
             htmlContentString,
             targetConfig: config,
         });

         if (result.error) {
             throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Search validation failed'));
         }

         return result;
     }
```

---

### 11. `[MODIFY]` `src/modules/data-provider/runners/discovery.runner.ts`
> **Action**: Thay thế `ITargetConfig` bằng `IScrapingTargetConfig`.

```diff
@@ line 27 @@
-    ITargetConfig,
+    IScrapingTargetConfig,
@@ line 64 @@
-            const targetConfig = searchFeature?.config as ITargetConfig;
+            const targetConfig = searchFeature?.config as IScrapingTargetConfig;
@@ line 250 @@
-    private async fetchHtml(url: string, targetConfig?: ITargetConfig): Promise<IDiscoveryFetchHtmlResult> {
+    private async fetchHtml(url: string, targetConfig?: IScrapingTargetConfig): Promise<IDiscoveryFetchHtmlResult> {
```

---

### 12. `[MODIFY]` `src/modules/data-provider/entities/data-provider-feature.entity.ts`
> **Action**: Thay thế `Record<string, any>` bằng `TargetConfig`.

```diff
@@ line 4 @@
 import { AbstractEntity } from '../../../common/entities';
 import { DataProviderFeatureErrorType, DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
+import { TargetConfig } from '../interfaces/target-config.interface';
 import { ConfigVersionEntity } from './config-version.entity';
 import { DataProviderEntity } from './data-provider.entity';
@@ line 28 @@
     @Column({ type: 'jsonb', nullable: true })
     @AutoMap()
-    config?: Record<string, any>;
+    config?: TargetConfig;

     @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
```

---

### 13. `[MODIFY]` `src/modules/data-provider/entities/config-version.entity.ts`
> **Action**: Thay thế `Record<string, any>` bằng `TargetConfig`.

```diff
@@ line 6 @@
 import { ConfigVersionType } from '../enums';
+import { TargetConfig } from '../interfaces/target-config.interface';
 import { DataProviderFeatureEntity } from './data-provider-feature.entity';
@@ line 23 @@
     @Column({ type: 'jsonb' })
     @AutoMap()
-    config: Record<string, any>;
+    config: TargetConfig;

     @Column({ name: 'change_type', type: 'varchar', length: 100 })
```

---

### 14. `[MODIFY]` `src/modules/data-provider/dtos/data-provider-feature.dto.ts`
> **Action**: Cập nhật type của `config` thành `TargetConfig`.

```diff
@@ line 4 @@
 import { AbstractDto } from '../../../common/dto/abstract.dto';
 import { DataProviderFeatureErrorType, DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
+import { TargetConfig } from '../interfaces/target-config.interface';
 import { ConfigVersionDto } from './config-version.dto';
 import { DataProviderDto } from './data-provider.dto';
@@ line 26 @@
     @ApiResponseProperty({ type: Object })
     @AutoMap()
-    config?: Record<string, any>;
+    config?: TargetConfig;

     @ApiResponseProperty()
```

---

### 15. `[MODIFY]` `src/modules/data-provider/dtos/config-version.dto.ts`
> **Action**: Cập nhật type của `config` thành `TargetConfig`.

```diff
@@ line 6 @@
 import { ConfigVersionType } from '../enums';
+import { TargetConfig } from '../interfaces/target-config.interface';
 import { DataProviderFeatureDto } from './data-provider-feature.dto';
@@ line 22 @@
     @ApiResponseProperty({ type: Object })
     @AutoMap()
-    config: Record<string, any>;
+    config: TargetConfig;

     @ApiResponseProperty()
```

---

### 16. `[MODIFY]` `src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts`
> **Action**: Chuẩn hóa type của `config` thành `TargetConfig` và `input` thành `FeatureTestInput`.

```diff
@@ line 2 @@
 import { DataProviderFeatureType, ScraperServiceEnum } from '../../enums';
+import { FeatureTestInput, TargetConfig } from '../../interfaces/target-config.interface';

 export class CreateDataProviderFeatureRequestDto {
@@ line 13 @@
     @ObjectFieldOptional({ description: 'Feature configuration payload' })
-    config?: Record<string, unknown>;
+    config?: TargetConfig;

     @ObjectFieldOptional({ description: 'Test input payload to verify feature before creating' })
-    input?: Record<string, unknown>;
+    input?: FeatureTestInput;
 }

 export class UpdateFeatureConfigRequestDto {
@@ line 24 @@
     @ObjectFieldOptional({ description: 'Feature configuration payload' })
-    config?: Record<string, unknown>;
+    config?: TargetConfig;

     @ObjectFieldOptional({ description: 'Test input payload to verify feature before updating' })
-    input?: Record<string, unknown>;
+    input?: FeatureTestInput;
 }

 export class TestFeatureStatelessRequestDto {
@@ line 41 @@
     @ObjectFieldOptional({ description: 'Raw draft configuration payload' })
-    config: Record<string, unknown>;
+    config: TargetConfig;

     @ObjectFieldOptional({ description: 'Test input payload (e.g. url, htmlContentString, query)' })
-    input?: Record<string, unknown>;
+    input?: FeatureTestInput;
 }
```

---

### 17. `[MODIFY]` `src/modules/data-provider/dtos/requests/config-version-request.dto.ts`
> **Action**: Cập nhật type của `config` trong `CreateConfigVersionRequestDto` thành `TargetConfig`.

```diff
@@ line 3 @@
 import { ConfigVersionType } from '../../enums';
+import { TargetConfig } from '../../interfaces/target-config.interface';

 export class CreateConfigVersionRequestDto {
@@ line 9 @@
     @AutoMap()
-    config: Record<string, any>;
+    config: TargetConfig;

     @AutoMap()
```

---

### 18. `[MODIFY]` `src/modules/data-provider/dtos/responses/scrape-item-data-response.dto.ts`
> **Action**: Thay thế `ITargetConfig` bằng `IScrapingTargetConfig`.

```diff
@@ line 1 @@
-import { ITargetConfig } from '../../interfaces';
+import { IScrapingTargetConfig } from '../../interfaces';
@@ line 26 @@
     // Request
-    request?: ITargetConfig;
+    request?: IScrapingTargetConfig;

     constructor(data?: Partial<ScrapeItemDataResponseDto>) {
```

---

### 19. `[MODIFY]` `src/modules/data-provider/controllers/data-provider-feature.controller.ts`
> **Action**: Thay thế `Promise<any>` tại `testStateless` bằng kiểu dữ liệu response cụ thể.

```diff
@@ line 7 @@
 import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
+import { IExtractDataResponse, ISearchExtractDataResponse } from '../interfaces';
 import {
@@ line 59 @@
-    async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<any> {
+    async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<IExtractDataResponse | ISearchExtractDataResponse> {
         const runner = this.runnerRegistry.getRunner(request.type);
-        const result = await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
+        const result = (await runner.testStateless(
+            request.service || ScraperServiceEnum.GENERIC,
+            request.config,
+            request.input,
+        )) as IExtractDataResponse | ISearchExtractDataResponse;
         if (result && Array.isArray(result.data)) {
             result.data = result.data.slice(0, 3);
         }

         return result;
     }
```

---

### 20. `[MODIFY]` `src/modules/data-provider/services/data-provider-scraper.service.ts`
> **Action**: Thay thế `ITargetConfig` bằng `IScrapingTargetConfig`.

```diff
@@ line 7 @@
-import { IDataProviderScraperService, ITargetConfig } from '../interfaces';
+import { IDataProviderScraperService, IScrapingTargetConfig } from '../interfaces';
@@ line 47 @@
-        const targetConfig = scrapingFeature.config as ITargetConfig;
+        const targetConfig = scrapingFeature.config as IScrapingTargetConfig;
@@ line 76 @@
-        targetConfig: ITargetConfig;
+        targetConfig: IScrapingTargetConfig;
```

---

### 21. `[MODIFY]` `src/modules/data-provider/services/data-provider-scraper/generic-data-provider-scraper.service.ts` (và local/api scrapers)
> **Action**: Thay thế `ITargetConfig` bằng `IScrapingTargetConfig` trong generic, local và api scrapers.

```diff
@@ line 13 @@
-    ITargetConfig,
+    IScrapingTargetConfig,
@@ line 28 @@
-        const targetConfig: ITargetConfig = scrapingFeature?.config as ITargetConfig;
+        const targetConfig: IScrapingTargetConfig = scrapingFeature?.config as IScrapingTargetConfig;
```

---

### 22. `[MODIFY]` `src/modules/data-provider/services/data-provider-feature.service.ts`
> **Action**: Gọi `runner.validateConfig` trước khi kiểm thử sandbox hoặc lưu trữ feature và version snapshot.

```diff
@@ line 38 @@
     async createFeature(dataProviderId: string, request: CreateDataProviderFeatureRequestDto): Promise<DataProviderFeatureDto> {
         const existing = await this.exists({ dataProviderId, type: request.type });
         if (existing) throw new AppException(DataProviderError.FeatureAlreadyExists(request.type, dataProviderId));

+        const runner = this.runnerRegistry.getRunner(request.type);
+        const validatedConfig = request.config ? runner.validateConfig(request.config) : undefined;

         if (request.input) {
-            const runner = this.runnerRegistry.getRunner(request.type);
-            await runner.testStateless(request.service, request.config, request.input);
+            await runner.testStateless(request.service, validatedConfig, request.input);
         }

         const status = request.input ? DataProviderFeatureStatus.READY : DataProviderFeatureStatus.UNCONFIGURED;
         const entity = this.dataProviderFeatureRepository.create({
             status,
             dataProviderId,
             type: request.type,
-            config: request.config,
+            config: validatedConfig,
             service: request.service,
         });

         const created = await super.create(entity);
         return created;
     }

     async updateFeatureConfig(id: string, request: UpdateFeatureConfigRequestDto, user?: PayloadDto): Promise<DataProviderFeatureDto> {
         const feature = await this.findById(id);
         if (!feature) throw new AppException(DataProviderError.FeatureNotFound(id));

+        const runner = this.runnerRegistry.getRunner(feature.type);
+        const validatedConfig = request.config ? runner.validateConfig(request.config) : undefined;

         if (request.input) {
-            const runner = this.runnerRegistry.getRunner(feature.type);
-            await runner.testStateless(feature.service, request.config, request.input);
+            await runner.testStateless(feature.service, validatedConfig, request.input);
         }

         // Create version snapshot
-        await this.configVersionService.create(
-            {
-                featureId: id,
-                isActive: true,
-                config: request.config,
-                changeType: ConfigVersionType.MANUAL_EDIT,
-                changeDescription: request.changeDescription,
-            },
-            user,
-        );
+        if (validatedConfig) {
             await this.configVersionService.create(
                 {
                     featureId: id,
                     isActive: true,
                     config: validatedConfig,
                     changeType: ConfigVersionType.MANUAL_EDIT,
                     changeDescription: request.changeDescription,
                 },
                 user,
             );
         }

         const newStatus = [DataProviderFeatureStatus.UNCONFIGURED, DataProviderFeatureStatus.ERROR].includes(feature.status)
             ? DataProviderFeatureStatus.TESTING
             : feature.status;

         await super.update(id, {
             status: newStatus,
             lastErrorType: null,
             consecutiveFailures: 0,
             lastErrorMessage: null,
-            config: request.config,
+            config: validatedConfig,
         });

         const updated = await this.findById(id);
         return updated;
     }
```

---

## Section 5. Test Cases & Verification
 
- **Automated Tests**:
  - `[x]` `npx ts-node -e "import { TargetConfigValidatorHelper } ..."` (PASS - 4/4 test suites for schema validation, syntax checking, type routing, and boundary guards passed)
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` (PASS - Exit code 0, 0 compiler errors across codebase)
- **Manual Verification**:
  1. `[x]` `POST /data-provider-features/provider/:dataProviderId` với payload `config` không có `functionGenerator` $\rightarrow$ Nhận mã lỗi HTTP 400 (`data_provider_invalid_feature_config`).
  2. `[x]` `POST /data-provider-features/provider/:dataProviderId` với `functionGenerator: "const x = {;"` (sai cú pháp JS) $\rightarrow$ Nhận mã lỗi HTTP 400 (`data_provider_invalid_feature_config`).
  3. `[x]` `POST /data-provider-features/provider/:dataProviderId` với `config` hợp lệ $\rightarrow$ Tạo feature thành công và lưu đúng schema `TargetConfig`.

