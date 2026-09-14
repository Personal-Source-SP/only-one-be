---
status: done
slug: refactor-feature-runners-to-services
started_at: 2026-09-14
completed_at: 2026-09-14
pr_url: ~
branch: ~
---

# Plan: Chuyển đổi Feature Runners thành Services & Chuẩn hóa Interface IDataProviderFeatureService

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: Các module xử lý từng feature type (`SCRAPING`, `SEARCH`) đang được định danh dưới tên "Runner" (`ScrapingFeatureRunner`, `SearchFeatureRunner`) và đặt trong thư mục `src/modules/data-provider/runners/`. Trong khi đó, toàn bộ domain logic của module `DataProvider` đều đi theo mô hình Service (`services/data-provider-scraper/`, `services/data-provider-search/`).
- **Điểm nghẽn kỹ thuật**:
  - `DataProviderFeatureService` duy trì phương thức `getRunner(type)` tạo ra thêm một tầng indirection không cần thiết.
  - Tồn tại đồng thời thư mục `runners/` và `services/` làm phân mảnh codebase.
  - Interface `IFeatureRunner` chưa đồng bộ với naming convention `IDataProviderFeatureService` (tương tự `IDataProviderScraperService`, `IDataProviderSearchService`).
- **Invariants bắt buộc giữ nguyên**:
  - `Invariant 1 (Error Handling)`: Nếu `type` không khớp với service nào trong map, bắt buộc ném `AppException(DataProviderError.RunnerNotFound(type))`.
  - `Invariant 2 (Behavioral Parity)`: Toàn bộ nghiệp vụ tạo, cập nhật cấu hình, đổi trạng thái và test stateless của Feature giữ nguyên 100%.
  - `Invariant 3 (API Contracts)`: Không thay đổi bất kỳ DTO hay REST endpoints nào của DataProvider.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md; không mô tả lại giải pháp tổng quan)*

### Type Signatures & Code Contracts

- **Interface Contract (`IDataProviderFeatureService`)**:
  ```typescript
  // src/modules/data-provider/interfaces/data-provider-feature-service.interface.ts
  import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
  import { ScraperServiceEnum } from '../enums';
  import { FeatureTestInput, TargetConfig } from './target-config.interface';

  export interface IDataProviderFeatureService<
      TConfig = TargetConfig,
      TInput = FeatureTestInput,
      TResult = unknown,
  > {
      validateConfig(config: unknown): TConfig;
      testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
      testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
  }
  ```

- **Injection Token Constant**:
  ```typescript
  // src/modules/data-provider/constants/data-provider-feature-service-map.ts
  export const DATA_PROVIDER_FEATURE_SERVICE_MAP = 'DataProviderFeatureServiceMap';
  ```

- **Custom Provider Factory Signature (`DataProviderModule`)**:
  ```typescript
  {
      provide: DATA_PROVIDER_FEATURE_SERVICE_MAP,
      useFactory: (
          scrapingFeatureService: ScrapingFeatureService,
          searchFeatureService: SearchFeatureService,
      ): Record<string, IDataProviderFeatureService> => ({
          [DataProviderFeatureType.SCRAPING]: scrapingFeatureService,
          [DataProviderFeatureType.SEARCH]: searchFeatureService,
      }),
      inject: [ScrapingFeatureService, SearchFeatureService],
  }
  ```

### AST Seams & Callers

1. `data-provider-feature-service.interface.ts` `[NEW]`: Định nghĩa interface `IDataProviderFeatureService`.
2. `interfaces/index.ts` `[MODIFY]`: Export `data-provider-feature-service.interface.ts` thay vì `feature-runner.interface.ts`.
3. `interfaces/feature-runner.interface.ts` `[DELETE]`: Xóa interface cũ.
4. `constants/data-provider-feature-service-map.ts` `[NEW]`: Khởi tạo constant token `DATA_PROVIDER_FEATURE_SERVICE_MAP`.
5. `constants/data-provider-feature-runner-map.ts` `[DELETE]`: Xóa constant cũ.
6. `services/data-provider-feature/scraping-feature.service.ts` `[NEW]`: Chuyển từ `scraping-feature.runner.ts`, implement `IDataProviderFeatureService`.
7. `services/data-provider-feature/search-feature.service.ts` `[NEW]`: Chuyển từ `search-feature.runner.ts`, implement `IDataProviderFeatureService`.
8. `runners/scraping-feature.runner.ts` `[DELETE]`: Xóa runner cũ.
9. `runners/search-feature.runner.ts` `[DELETE]`: Xóa runner cũ.
10. `runners/_tests/search-feature.runner.spec.ts` `[DELETE]`: Xóa runner test cũ.
11. `services/_tests/search-feature.service.spec.ts` `[NEW]`: Chuyển test sang test `SearchFeatureService`.
12. `services/data-provider-feature.service.ts` `[MODIFY]`:
    - Inject `DATA_PROVIDER_FEATURE_SERVICE_MAP`.
    - Xóa helper `getRunner(type)`.
    - Lấy trực tiếp từ `this.featureServiceMap[type]`, throw `AppException(DataProviderError.RunnerNotFound(type))` nếu null/undefined.
13. `services/discovery-session.service.ts` `[MODIFY]`: Đổi injection `SearchFeatureRunner` $\rightarrow$ `SearchFeatureService`.
14. `services/_tests/discovery-session.service.spec.ts` `[MODIFY]`: Đổi mock `searchFeatureRunner` $\rightarrow$ `searchFeatureService`.
15. `services/_tests/data-provider-feature.service.spec.ts` `[MODIFY]`: Đổi token mock sang `DATA_PROVIDER_FEATURE_SERVICE_MAP`.
16. `data-provider.module.ts` `[MODIFY]`: Đăng ký `ScrapingFeatureService`, `SearchFeatureService`, `DATA_PROVIDER_FEATURE_SERVICE_MAP` trong `providers` và `exports`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── constants/
│   ├── [NEW]    data-provider-feature-service-map.ts    # Token DATA_PROVIDER_FEATURE_SERVICE_MAP
│   └── [DELETE] data-provider-feature-runner-map.ts     # Xóa token cũ
├── interfaces/
│   ├── [NEW]    data-provider-feature-service.interface.ts # Interface IDataProviderFeatureService
│   ├── [DELETE] feature-runner.interface.ts             # Xóa interface cũ
│   └── [MODIFY] index.ts                               # Export interface mới
├── runners/
│   ├── [DELETE] scraping-feature.runner.ts             # Xóa runner cũ
│   ├── [DELETE] search-feature.runner.ts               # Xóa runner cũ
│   └── _tests/
│       └── [DELETE] search-feature.runner.spec.ts      # Xóa test cũ
├── services/
│   ├── data-provider-feature/
│   │   ├── [NEW] scraping-feature.service.ts           # Service ScrapingFeature
│   │   └── [NEW] search-feature.service.ts             # Service SearchFeature
│   ├── [MODIFY] data-provider-feature.service.ts       # Bỏ getRunner, inject token map mới
│   ├── [MODIFY] discovery-session.service.ts           # Inject SearchFeatureService
│   └── _tests/
│       ├── [NEW]    search-feature.service.spec.ts     # Test suite cho SearchFeatureService
│       ├── [MODIFY] data-provider-feature.service.spec.ts # Cập nhật test mock token
│       └── [MODIFY] discovery-session.service.spec.ts  # Cập nhật test mock SearchFeatureService
└── [MODIFY] data-provider.module.ts                    # Đăng ký services và token map mới
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/modules/data-provider/interfaces/data-provider-feature-service.interface.ts` | `IDataProviderFeatureService` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/index.ts` | `export *` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[DELETE]` | `src/modules/data-provider/interfaces/feature-runner.interface.ts` | `IFeatureRunner` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[NEW]` | `src/modules/data-provider/constants/data-provider-feature-service-map.ts` | `DATA_PROVIDER_FEATURE_SERVICE_MAP` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[DELETE]` | `src/modules/data-provider/constants/data-provider-feature-runner-map.ts` | `DATA_PROVIDER_FEATURE_RUNNER_MAP` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[NEW]` | `src/modules/data-provider/services/data-provider-feature/scraping-feature.service.ts` | `ScrapingFeatureService` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **7** | `[x]` | `[NEW]` | `src/modules/data-provider/services/data-provider-feature/search-feature.service.ts` | `SearchFeatureService` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **8** | `[x]` | `[DELETE]` | `src/modules/data-provider/runners/scraping-feature.runner.ts` | `ScrapingFeatureRunner` | `Order 6` | `npx tsc -p tsconfig.build.json --noEmit` |
| **9** | `[x]` | `[DELETE]` | `src/modules/data-provider/runners/search-feature.runner.ts` | `SearchFeatureRunner` | `Order 7` | `npx tsc -p tsconfig.build.json --noEmit` |
| **10** | `[x]` | `[DELETE]` | `src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts` | `SearchFeatureRunner Spec` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **11** | `[x]` | `[NEW]` | `src/modules/data-provider/services/_tests/search-feature.service.spec.ts` | `SearchFeatureService Spec` | `Order 7` | `npx tsc -p tsconfig.build.json --noEmit` |
| **12** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-feature.service.ts` | `DataProviderFeatureService` (bỏ `getRunner`) | `Order 1, 4` | `npx tsc -p tsconfig.build.json --noEmit` |
| **13** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-session.service.ts` | `DiscoverySessionService` | `Order 7` | `npx tsc -p tsconfig.build.json --noEmit` |
| **14** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/_tests/discovery-session.service.spec.ts` | `DiscoverySessionService Spec` | `Order 13` | `npx tsc -p tsconfig.build.json --noEmit` |
| **15** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/_tests/data-provider-feature.service.spec.ts` | `DataProviderFeatureService Spec` | `Order 12` | `npx tsc -p tsconfig.build.json --noEmit` |
| **16** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | `DataProviderModule` | `Order 4, 6, 7, 12, 13` | `npx tsc -p tsconfig.build.json --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/modules/data-provider/interfaces/data-provider-feature-service.interface.ts`
> **Action**: Tạo interface chung `IDataProviderFeatureService`.

```typescript
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../enums';
import { FeatureTestInput, TargetConfig } from './target-config.interface';

export interface IDataProviderFeatureService<
    TConfig = TargetConfig,
    TInput = FeatureTestInput,
    TResult = unknown,
> {
    validateConfig(config: unknown): TConfig;
    testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
    testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
}
```

---

### 2. `[MODIFY]` `src/modules/data-provider/interfaces/index.ts`
> **Action**: Thay thế export `feature-runner.interface` bằng `data-provider-feature-service.interface`.

```diff
@@ -1,5 +1,5 @@
+export * from './data-provider-feature-service.interface';
 export * from './data-provider-scraper-service.interface';
 export * from './data-provider-search-service.interface';
 export * from './discovery-runner.interface';
 export * from './discovery-session.interface';
-export * from './feature-runner.interface';
```

---

### 3. `[NEW]` `src/modules/data-provider/constants/data-provider-feature-service-map.ts`
> **Action**: Tạo Injection Token `DATA_PROVIDER_FEATURE_SERVICE_MAP`.

```typescript
export const DATA_PROVIDER_FEATURE_SERVICE_MAP = 'DataProviderFeatureServiceMap';
```

---

### 4. `[NEW]` `src/modules/data-provider/services/data-provider-feature/scraping-feature.service.ts`
> **Action**: Tạo class `ScrapingFeatureService` implement `IDataProviderFeatureService`.

```typescript
import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderError } from '../../constants/data-provider-error';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../../constants/data-provider-scraper-service-map';
import { ValidateParserFunctionResponseDto } from '../../dtos/responses';
import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../../enums';
import { TargetConfigValidatorHelper } from '../../helpers/target-config-validator.helper';
import {
    FeatureTestInput,
    IDataProviderFeatureService,
    IDataProviderScraperService,
    IExtractDataResponse,
    IScrapingTargetConfig,
} from '../../interfaces';
import { DataProviderItemService } from '../data-provider-item.service';

@Injectable()
export class ScrapingFeatureService
    implements IDataProviderFeatureService<IScrapingTargetConfig, FeatureTestInput, IExtractDataResponse | ValidateParserFunctionResponseDto>
{
    constructor(
        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
        @Inject(forwardRef(() => DataProviderItemService))
        private readonly dataProviderItemService: DataProviderItemService,
    ) {}

    validateConfig(config: unknown): IScrapingTargetConfig {
        return TargetConfigValidatorHelper.validateScrapingTargetConfig(config);
    }

    async testStateless(
        service: ScraperServiceEnum,
        config: IScrapingTargetConfig,
        input: FeatureTestInput,
    ): Promise<IExtractDataResponse> {
        const targetConfig = this.validateConfig(config);
        const { url, dataContent, htmlContentString } = input || {};
        if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingTestInput);

        const scraperService = this.dataProviderScraperServiceMap[service];
        if (!scraperService) throw new AppException(DataProviderError.ScraperServiceNotFound(service));

        const result = await scraperService.getExtractData({
            url,
            dataContent,
            targetConfig,
            htmlContentString,
        });
        if (result.error) throw new AppException(DataProviderError.FeatureTestFailed(result.error));

        return result;
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: FeatureTestInput): Promise<ValidateParserFunctionResponseDto> {
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
            targetConfig: feature.config as IScrapingTargetConfig,
        });

        if (result.status !== 'success') {
            throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Scraping validation failed'));
        }

        return result;
    }
}
```

---

### 5. `[NEW]` `src/modules/data-provider/services/data-provider-feature/search-feature.service.ts`
> **Action**: Tạo class `SearchFeatureService` implement `IDataProviderFeatureService`.

```typescript
import { Inject, Injectable } from '@nestjs/common';

import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderError } from '../../constants/data-provider-error';
import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../../constants/data-provider-search-service-map';
import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../../enums';
import { TargetConfigValidatorHelper } from '../../helpers/target-config-validator.helper';
import {
    FeatureTestInput,
    IDataProviderFeatureService,
    IDataProviderSearchService,
    ISearchExtractDataResponse,
    ISearchTargetConfig,
} from '../../interfaces';

@Injectable()
export class SearchFeatureService implements IDataProviderFeatureService<ISearchTargetConfig, FeatureTestInput, ISearchExtractDataResponse> {
    constructor(
        @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
        private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
    ) {}

    validateConfig(config: unknown): ISearchTargetConfig {
        return TargetConfigValidatorHelper.validateSearchTargetConfig(config);
    }

    buildSearchUrl(config: ISearchTargetConfig, input?: FeatureTestInput): string {
        if (input?.url) {
            return input.url;
        }

        const query = (input?.query || '').trim();
        const pattern = config?.searchUrlPattern?.trim();

        if (!pattern) {
            return '';
        }

        const placeholder = config?.queryPlaceholder?.trim() || '{query}';
        let targetPattern = pattern;

        if (!targetPattern.includes(placeholder) && query) {
            const hasAnyPlaceholder = /\{[a-zA-Z0-9_-]+\}/.test(targetPattern);
            if (!hasAnyPlaceholder) {
                const cleanPlaceholder = placeholder.startsWith('/') ? placeholder.slice(1) : placeholder;
                targetPattern = targetPattern.endsWith('/')
                    ? `${targetPattern}${cleanPlaceholder}`
                    : `${targetPattern}/${cleanPlaceholder}`;
            }
        }

        if (!query) {
            return targetPattern;
        }

        const encodedQuery = encodeURIComponent(query);
        if (targetPattern.includes(placeholder)) {
            return targetPattern.split(placeholder).join(encodedQuery);
        }

        return targetPattern.replace(/\{[a-zA-Z0-9_-]+\}/g, encodedQuery);
    }

    async testStateless(
        service: ScraperServiceEnum,
        config: ISearchTargetConfig,
        input: FeatureTestInput,
    ): Promise<ISearchExtractDataResponse> {
        const targetConfig = this.validateConfig(config);
        const { htmlContentString, dataContent } = input || {};

        const url = this.buildSearchUrl(targetConfig, input);
        if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingSearchTestInput);

        const searchService = this.dataProviderSearchServiceMap[service];
        if (!searchService) throw new AppException(DataProviderError.SearchServiceNotFound(service));

        const result = await searchService.getExtractSearchData({
            url,
            dataContent,
            targetConfig,
            htmlContentString,
        });
        if (result.error) throw new AppException(DataProviderError.FeatureTestFailed(result.error));

        return result;
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: FeatureTestInput): Promise<ISearchExtractDataResponse> {
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
}
```

---

### 6. `[MODIFY]` `src/modules/data-provider/services/data-provider-feature.service.ts`
> **Action**: Loại bỏ helper `getRunner`, inject `DATA_PROVIDER_FEATURE_SERVICE_MAP`, và xử lý lấy feature service trực tiếp.

```diff
@@ -10,3 +10,3 @@
 import { NOTIFICATION_EVENTS } from '../../notification/constants/notification.constant';
 import { NotificationType } from '../../notification/enum/notification.enum';
 import { DataProviderError } from '../constants/data-provider-error';
-import { DATA_PROVIDER_FEATURE_RUNNER_MAP } from '../constants/data-provider-feature-runner-map';
+import { DATA_PROVIDER_FEATURE_SERVICE_MAP } from '../constants/data-provider-feature-service-map';
 import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
@@ -24,3 +24,3 @@
-import { IExtractDataResponse, IFeatureRunner, ISearchExtractDataResponse } from '../interfaces';
+import { IDataProviderFeatureService, IExtractDataResponse, ISearchExtractDataResponse } from '../interfaces';
 import { ConfigVersionService } from './config-version.service';
@@ -35,4 +35,4 @@
         @InjectMapper() mapper: Mapper,
-        @Inject(DATA_PROVIDER_FEATURE_RUNNER_MAP)
-        private readonly featureRunnerMap: Record<string, IFeatureRunner>,
+        @Inject(DATA_PROVIDER_FEATURE_SERVICE_MAP)
+        private readonly featureServiceMap: Record<string, IDataProviderFeatureService>,
         @InjectRepository(DataProviderFeatureEntity)
         private readonly dataProviderFeatureRepository: Repository<DataProviderFeatureEntity>,
     ) {
         super(dataProviderFeatureRepository, mapper, DataProviderFeatureDto, DataProviderFeatureService.name);
     }
-
-    private getRunner(type: DataProviderFeatureType): IFeatureRunner {
-        const runner = this.featureRunnerMap[type];
-        if (!runner) {
-            throw new AppException(DataProviderError.RunnerNotFound(type));
-        }
-        return runner;
-    }
 
     async createFeature(request: CreateDataProviderFeatureRequestDto): Promise<DataProviderFeatureDto> {
         const { dataProviderId, type, service, config, input } = request;
 
         const existing = await this.exists({ dataProviderId, type });
         if (existing) throw new AppException(DataProviderError.FeatureAlreadyExists(type, dataProviderId));
 
-        const runner = this.getRunner(type);
-        const validatedConfig = config ? runner.validateConfig(config) : undefined;
+        const featureService = this.featureServiceMap[type];
+        if (!featureService) throw new AppException(DataProviderError.RunnerNotFound(type));
+        const validatedConfig = config ? featureService.validateConfig(config) : undefined;
 
         if (input) {
-            await runner.testStateless(service, validatedConfig, input);
+            await featureService.testStateless(service, validatedConfig, input);
         }
@@ -64,4 +60,5 @@
         const feature = await this.findById(id);
         if (!feature) throw new AppException(DataProviderError.FeatureNotFound(id));
 
-        const runner = this.getRunner(feature.type);
-        const validatedConfig = request.config ? runner.validateConfig(request.config) : undefined;
+        const featureService = this.featureServiceMap[feature.type];
+        if (!featureService) throw new AppException(DataProviderError.RunnerNotFound(feature.type));
+        const validatedConfig = request.config ? featureService.validateConfig(request.config) : undefined;
 
         if (request.input) {
-            await runner.testStateless(feature.service, validatedConfig, request.input);
+            await featureService.testStateless(feature.service, validatedConfig, request.input);
         }
@@ -161,2 +158,4 @@
-                const runner = this.getRunner(feature.type);
-                await runner.testContextual(feature as DataProviderFeatureEntity);
+                const featureService = this.featureServiceMap[feature.type];
+                if (!featureService) throw new AppException(DataProviderError.RunnerNotFound(feature.type));
+                await featureService.testContextual(feature as DataProviderFeatureEntity);
@@ -204,3 +203,5 @@
     async testStateless(request: TestFeatureStatelessRequestDto): Promise<IExtractDataResponse | ISearchExtractDataResponse> {
-        const runner = this.getRunner(request.type);
-        const result = (await runner.testStateless(request.service, request.config, request.input)) as
+        const featureService = this.featureServiceMap[request.type];
+        if (!featureService) throw new AppException(DataProviderError.RunnerNotFound(request.type));
+        const result = (await featureService.testStateless(request.service, request.config, request.input)) as
```

---

### 7. `[MODIFY]` `src/modules/data-provider/services/discovery-session.service.ts`
> **Action**: Import & inject `SearchFeatureService` thay vì `SearchFeatureRunner`.

```diff
@@ -34,3 +34,3 @@
 import { IDataProviderSearchService, ISearchTargetConfig, ISessionWithSearchFeature } from '../interfaces';
-import { SearchFeatureRunner } from '../runners/search-feature.runner';
+import { SearchFeatureService } from './data-provider-feature/search-feature.service';
 import { DataProviderService } from './data-provider.service';
@@ -43,3 +43,3 @@
         private readonly queueService: QueueService,
-        private readonly searchFeatureRunner: SearchFeatureRunner,
+        private readonly searchFeatureService: SearchFeatureService,
         private readonly dataProviderService: DataProviderService,
@@ -249,3 +249,3 @@
-        const searchUrl = this.searchFeatureRunner.buildSearchUrl(targetConfig, { query: keyword }) || session.targetUrl || '';
+        const searchUrl = this.searchFeatureService.buildSearchUrl(targetConfig, { query: keyword }) || session.targetUrl || '';
```

---

### 8. `[MODIFY]` `src/modules/data-provider/data-provider.module.ts`
> **Action**: Cập nhật đăng ký services `ScrapingFeatureService`, `SearchFeatureService` và provider `DATA_PROVIDER_FEATURE_SERVICE_MAP`.

```diff
@@ -5,3 +5,3 @@
 import { UserModule } from '../user/user.module';
-import { DATA_PROVIDER_FEATURE_RUNNER_MAP } from './constants/data-provider-feature-runner-map';
+import { DATA_PROVIDER_FEATURE_SERVICE_MAP } from './constants/data-provider-feature-service-map';
 import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from './constants/data-provider-scraper-service-map';
@@ -29,6 +29,7 @@
 import { UrlResolverHelper } from './helpers/url-resolver.helper';
-import { IDataProviderScraperService, IDataProviderSearchService, IFeatureRunner } from './interfaces';
+import { IDataProviderFeatureService, IDataProviderScraperService, IDataProviderSearchService } from './interfaces';
 import { ScrapingDataListener } from './listeners/scraping-data.listener';
-import { ScrapingFeatureRunner } from './runners/scraping-feature.runner';
-import { SearchFeatureRunner } from './runners/search-feature.runner';
+import { ScrapingFeatureService } from './services/data-provider-feature/scraping-feature.service';
+import { SearchFeatureService } from './services/data-provider-feature/search-feature.service';
@@ -72,3 +73,3 @@
 ];
-const runners = [ScrapingFeatureRunner, SearchFeatureRunner];
+const featureServices = [ScrapingFeatureService, SearchFeatureService];
 const services = [
@@ -95,3 +96,3 @@
     DiscoveryUrlService,
-    ...runners,
+    ...featureServices,
 ];
@@ -126,9 +127,9 @@
         {
-            provide: DATA_PROVIDER_FEATURE_RUNNER_MAP,
+            provide: DATA_PROVIDER_FEATURE_SERVICE_MAP,
             useFactory: (
-                scrapingFeatureRunner: ScrapingFeatureRunner,
-                searchFeatureRunner: SearchFeatureRunner,
-            ): Record<string, IFeatureRunner> => ({
-                [DataProviderFeatureType.SCRAPING]: scrapingFeatureRunner,
-                [DataProviderFeatureType.SEARCH]: searchFeatureRunner,
+                scrapingFeatureService: ScrapingFeatureService,
+                searchFeatureService: SearchFeatureService,
+            ): Record<string, IDataProviderFeatureService> => ({
+                [DataProviderFeatureType.SCRAPING]: scrapingFeatureService,
+                [DataProviderFeatureType.SEARCH]: searchFeatureService,
             }),
-            inject: [ScrapingFeatureRunner, SearchFeatureRunner],
+            inject: [ScrapingFeatureService, SearchFeatureService],
         },
@@ -139,3 +140,3 @@
         DATA_PROVIDER_SCRAPER_SERVICE_MAP,
-        DATA_PROVIDER_FEATURE_RUNNER_MAP,
+        DATA_PROVIDER_FEATURE_SERVICE_MAP,
     ],
```

---

### 9. `[MODIFY]` `src/modules/data-provider/services/_tests/data-provider-feature.service.spec.ts`
> **Action**: Cập nhật mock provider `DATA_PROVIDER_FEATURE_SERVICE_MAP`.

```diff
@@ -6,3 +6,3 @@
 import { DataProviderError } from '../../constants/data-provider-error';
-import { DATA_PROVIDER_FEATURE_RUNNER_MAP } from '../../constants/data-provider-feature-runner-map';
+import { DATA_PROVIDER_FEATURE_SERVICE_MAP } from '../../constants/data-provider-feature-service-map';
 import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
@@ -16,3 +16,3 @@
     let mockRepo: any;
-    let mockRunnerMap: any;
+    let mockServiceMap: any;
     let mockRunner: any;
@@ -36,3 +36,3 @@
-        mockRunnerMap = {
+        mockServiceMap = {
             [DataProviderFeatureType.SCRAPING]: mockRunner,
             [DataProviderFeatureType.SEARCH]: mockRunner,
@@ -58,3 +58,3 @@
                 { provide: getRepositoryToken(DataProviderFeatureEntity), useValue: mockRepo },
-                { provide: DATA_PROVIDER_FEATURE_RUNNER_MAP, useValue: mockRunnerMap },
+                { provide: DATA_PROVIDER_FEATURE_SERVICE_MAP, useValue: mockServiceMap },
                 { provide: ConfigVersionService, useValue: mockConfigVersionService },
@@ -207,3 +207,3 @@
     describe('getRunner error handling', () => {
-        it('should throw RunnerNotFound when type is not registered in featureRunnerMap', async () => {
+        it('should throw RunnerNotFound when type is not registered in featureServiceMap', async () => {
             await expect(
```

---

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` - PASS (0 errors)
- **Manual Checks**:
  - `[x]` Xác nhận thư mục `src/modules/data-provider/runners/` đã bị xoá hoàn toàn.
  - `[x]` Xác nhận `ScrapingFeatureService` và `SearchFeatureService` nằm trong `src/modules/data-provider/services/data-provider-feature/` và implement `IDataProviderFeatureService`.
  - `[x]` Xác nhận `DataProviderFeatureService` không còn hàm `getRunner(type)` và inject `DATA_PROVIDER_FEATURE_SERVICE_MAP`.

