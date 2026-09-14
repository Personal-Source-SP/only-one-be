---
status: done
slug: refactor-feature-runner-di-map
started_at: 2026-09-14
completed_at: 2026-09-14
pr_url: ~
branch: ~
---

# Plan: Refactor Feature Runner Registry sang NestJS DI Provider Factory Map

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: Module `DataProviderModule` đang áp dụng hai phong cách DI không đồng nhất: `DATA_PROVIDER_SCRAPER_SERVICE_MAP` và `DATA_PROVIDER_SEARCH_SERVICE_MAP` sử dụng NestJS Custom Provider Factory (`useFactory` + Injection Token `Record<string, Service>`), trong khi các feature runners lại được bọc qua một class trung gian `FeatureRunnerRegistry` (`feature-runner.registry.ts`).
- **Điểm nghẽn kỹ thuật**:
  - `DataProviderFeatureService` phải inject `FeatureRunnerRegistry` qua `forwardRef` để tránh circular dependency, gây phát sinh boilerplate class không cần thiết.
  - Phải duy trì unit test riêng `feature-runner.registry.spec.ts` cho class wrapper đơn giản chỉ làm nhiệm vụ map type sang runner.
- **Invariants bắt buộc giữ nguyên**:
  - `Invariant 1 (Error Semantic)`: Khi query runner với `type` không tồn tại, hệ thống bắt buộc ném `AppException(DataProviderError.RunnerNotFound(type))`.
  - `Invariant 2 (Behavioral Parity)`: Toàn bộ luồng nghiệp vụ trong `DataProviderFeatureService` (`createFeature`, `updateFeature`, `switchStatus`, `testStateless`) giữ nguyên 100% logic và exception contracts.
  - `Invariant 3 (Runner Implementation)`: `ScrapingFeatureRunner` và `SearchFeatureRunner` giữ nguyên 100% implementation, không thay đổi signature hay interface `IFeatureRunner`.
  - `Invariant 4 (API Compatibility)`: Không thay đổi bất kỳ REST API endpoint, controller route hay DTO format nào.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md; không mô tả lại giải pháp tổng quan)*

### Type Signatures & Code Contracts

- **Injection Token Constant**:
  ```typescript
  // src/modules/data-provider/constants/data-provider-feature-runner-map.ts
  export const DATA_PROVIDER_FEATURE_RUNNER_MAP = 'DataProviderFeatureRunnerMap';
  ```

- **Custom Provider Factory Signature**:
  ```typescript
  // src/modules/data-provider/data-provider.module.ts
  {
      provide: DATA_PROVIDER_FEATURE_RUNNER_MAP,
      useFactory: (
          scrapingFeatureRunner: ScrapingFeatureRunner,
          searchFeatureRunner: SearchFeatureRunner,
      ): Record<string, IFeatureRunner> => ({
          [DataProviderFeatureType.SCRAPING]: scrapingFeatureRunner,
          [DataProviderFeatureType.SEARCH]: searchFeatureRunner,
      }),
      inject: [ScrapingFeatureRunner, SearchFeatureRunner],
  }
  ```

- **Service Helper Contract**:
  ```typescript
  // src/modules/data-provider/services/data-provider-feature.service.ts
  private getRunner(type: DataProviderFeatureType): IFeatureRunner {
      const runner = this.featureRunnerMap[type];
      if (!runner) {
          throw new AppException(DataProviderError.RunnerNotFound(type));
      }
      return runner;
  }
  ```

### AST Seams & Callers

1. `data-provider-feature-runner-map.ts` `[NEW]`: Khởi tạo constant token `DATA_PROVIDER_FEATURE_RUNNER_MAP`.
2. `data-provider.module.ts` `[MODIFY]`:
   - Xóa import & reference `FeatureRunnerRegistry`.
   - Bổ sung provider `DATA_PROVIDER_FEATURE_RUNNER_MAP` qua `useFactory`.
   - Bổ sung `DATA_PROVIDER_FEATURE_RUNNER_MAP` vào mảng `exports`.
3. `data-provider-feature.service.ts` `[MODIFY]`:
   - Xóa `import { FeatureRunnerRegistry }`.
   - Inject `@Inject(DATA_PROVIDER_FEATURE_RUNNER_MAP) private readonly featureRunnerMap: Record<string, IFeatureRunner>`.
   - Tạo private helper method `getRunner(type: DataProviderFeatureType): IFeatureRunner`.
   - Thay thế các lời gọi `this.runnerRegistry.getRunner(...)` thành `this.getRunner(...)` tại các methods: `createFeature`, `updateFeature`, `switchStatus`, `testStateless`.
4. `feature-runner.registry.ts` `[DELETE]`: Xóa file class wrapper.
5. `feature-runner.registry.spec.ts` `[DELETE]`: Xóa file test của class wrapper.
6. `data-provider-feature.service.spec.ts` `[MODIFY]`:
   - Cập nhật mock provider: thay `{ provide: FeatureRunnerRegistry, useValue: mockRunnerRegistry }` bằng `{ provide: DATA_PROVIDER_FEATURE_RUNNER_MAP, useValue: mockRunnerMap }`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── constants/
│   └── [NEW]    data-provider-feature-runner-map.ts  # Token DATA_PROVIDER_FEATURE_RUNNER_MAP
├── runners/
│   ├── [DELETE] feature-runner.registry.ts          # Xóa wrapper class
│   └── _tests/
│       └── [DELETE] feature-runner.registry.spec.ts # Xóa spec tương ứng
├── services/
│   ├── [MODIFY] data-provider-feature.service.ts    # Inject token MAP và dùng helper getRunner
│   └── _tests/
│       └── [MODIFY] data-provider-feature.service.spec.ts # Cập nhật mock runner map provider
└── [MODIFY] data-provider.module.ts                 # Đăng ký factory provider và export token
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/modules/data-provider/constants/data-provider-feature-runner-map.ts` | `DATA_PROVIDER_FEATURE_RUNNER_MAP` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | `DataProviderModule.providers`, `DataProviderModule.exports` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-feature.service.ts` | `DataProviderFeatureService.constructor`, `DataProviderFeatureService.getRunner` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[DELETE]` | `src/modules/data-provider/runners/feature-runner.registry.ts` | `FeatureRunnerRegistry` | `Order 2, 3` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[DELETE]` | `src/modules/data-provider/runners/_tests/feature-runner.registry.spec.ts` | `describe('FeatureRunnerRegistry')` | `Order 4` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/_tests/data-provider-feature.service.spec.ts` | `DataProviderFeatureService Unit Tests` | `Order 3` | `npx tsc -p tsconfig.build.json --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/modules/data-provider/constants/data-provider-feature-runner-map.ts`
> **Action**: Khởi tạo token injection `DATA_PROVIDER_FEATURE_RUNNER_MAP`.

```typescript
export const DATA_PROVIDER_FEATURE_RUNNER_MAP = 'DataProviderFeatureRunnerMap';
```

---

### 2. `[MODIFY]` `src/modules/data-provider/data-provider.module.ts`
> **Action**: Thay thế `FeatureRunnerRegistry` bằng custom provider `DATA_PROVIDER_FEATURE_RUNNER_MAP` trong `providers` và `exports`.

```diff
@@ -4,2 +4,3 @@
 import { UserModule } from '../user/user.module';
+import { DATA_PROVIDER_FEATURE_RUNNER_MAP } from './constants/data-provider-feature-runner-map';
 import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from './constants/data-provider-scraper-service-map';
@@ -25,2 +26,3 @@
 import { ScraperServiceEnum } from './enums';
+import { DataProviderFeatureType } from './enums';
 import { ExtractDataHelper } from './helpers/extract-data.helper';
@@ -29,3 +31,3 @@
-import { IDataProviderScraperService, IDataProviderSearchService } from './interfaces';
+import { IDataProviderScraperService, IDataProviderSearchService, IFeatureRunner } from './interfaces';
 import { ScrapingDataListener } from './listeners/scraping-data.listener';
-import { FeatureRunnerRegistry } from './runners/feature-runner.registry';
 import { ScrapingFeatureRunner } from './runners/scraping-feature.runner';
@@ -74,1 +75,1 @@
-const runners = [ScrapingFeatureRunner, SearchFeatureRunner, FeatureRunnerRegistry];
+const runners = [ScrapingFeatureRunner, SearchFeatureRunner];
@@ -128,2 +129,12 @@
             inject: [ApiDataProviderSearchService, LocalDataProviderSearchService, GenericDataProviderSearchService],
         },
+        {
+            provide: DATA_PROVIDER_FEATURE_RUNNER_MAP,
+            useFactory: (
+                scrapingFeatureRunner: ScrapingFeatureRunner,
+                searchFeatureRunner: SearchFeatureRunner,
+            ): Record<string, IFeatureRunner> => ({
+                [DataProviderFeatureType.SCRAPING]: scrapingFeatureRunner,
+                [DataProviderFeatureType.SEARCH]: searchFeatureRunner,
+            }),
+            inject: [ScrapingFeatureRunner, SearchFeatureRunner],
+        },
     ],
@@ -136,2 +147,3 @@
         DATA_PROVIDER_SCRAPER_SERVICE_MAP,
+        DATA_PROVIDER_FEATURE_RUNNER_MAP,
     ],
```

---

### 3. `[MODIFY]` `src/modules/data-provider/services/data-provider-feature.service.ts`
> **Action**: Inject `DATA_PROVIDER_FEATURE_RUNNER_MAP`, tạo helper `getRunner`, và thay thế các vị trí gọi `runnerRegistry`.

```diff
@@ -3,1 +3,1 @@
-import { forwardRef, Inject, Injectable } from '@nestjs/common';
+import { Inject, Injectable } from '@nestjs/common';
@@ -13,2 +13,3 @@
 import { DataProviderError } from '../constants/data-provider-error';
+import { DATA_PROVIDER_FEATURE_RUNNER_MAP } from '../constants/data-provider-feature-runner-map';
 import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
@@ -23,2 +24,2 @@
-import { IExtractDataResponse, ISearchExtractDataResponse } from '../interfaces';
-import { FeatureRunnerRegistry } from '../runners/feature-runner.registry';
+import { IExtractDataResponse, IFeatureRunner, ISearchExtractDataResponse } from '../interfaces';
 import { ConfigVersionService } from './config-version.service';
@@ -35,2 +36,2 @@
-        @Inject(forwardRef(() => FeatureRunnerRegistry))
-        private readonly runnerRegistry: FeatureRunnerRegistry,
+        @Inject(DATA_PROVIDER_FEATURE_RUNNER_MAP)
+        private readonly featureRunnerMap: Record<string, IFeatureRunner>,
@@ -42,2 +43,9 @@
     }
 
+    private getRunner(type: DataProviderFeatureType): IFeatureRunner {
+        const runner = this.featureRunnerMap[type];
+        if (!runner) {
+            throw new AppException(DataProviderError.RunnerNotFound(type));
+        }
+        return runner;
+    }
+
     async createFeature(request: CreateDataProviderFeatureRequestDto): Promise<DataProviderFeatureDto> {
@@ -49,1 +57,1 @@
-        const runner = this.runnerRegistry.getRunner(type);
+        const runner = this.getRunner(type);
@@ -73,1 +81,1 @@
-        const runner = this.runnerRegistry.getRunner(feature.type);
+        const runner = this.getRunner(feature.type);
@@ -171,1 +179,1 @@
-                const runner = this.runnerRegistry.getRunner(feature.type);
+                const runner = this.getRunner(feature.type);
@@ -215,1 +223,1 @@
-        const runner = this.runnerRegistry.getRunner(request.type);
+        const runner = this.getRunner(request.type);
```

---

### 4. `[DELETE]` `src/modules/data-provider/runners/feature-runner.registry.ts`
> **Action**: Xóa bỏ class wrapper `FeatureRunnerRegistry`.
> **Lý do**: Không còn reference nào sau khi chuyển sang `DATA_PROVIDER_FEATURE_RUNNER_MAP`.

---

### 5. `[DELETE]` `src/modules/data-provider/runners/_tests/feature-runner.registry.spec.ts`
> **Action**: Xóa bỏ unit test của `FeatureRunnerRegistry`.
> **Lý do**: Class đã bị loại bỏ hoàn toàn khỏi codebase.

---

### 6. `[MODIFY]` `src/modules/data-provider/services/_tests/data-provider-feature.service.spec.ts`
> **Action**: Cập nhật provider mocking trong test module để mock `DATA_PROVIDER_FEATURE_RUNNER_MAP`.

```diff
@@ -6,3 +6,4 @@
 import { DataProviderError } from '../../constants/data-provider-error';
+import { DATA_PROVIDER_FEATURE_RUNNER_MAP } from '../../constants/data-provider-feature-runner-map';
 import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
 import { DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../../enums';
-import { FeatureRunnerRegistry } from '../../runners/feature-runner.registry';
 import { ConfigVersionService } from '../config-version.service';
@@ -16,3 +17,3 @@
     let mockRepo: any;
-    let mockRunnerRegistry: any;
+    let mockRunnerMap: any;
     let mockRunner: any;
@@ -36,3 +37,4 @@
-        mockRunnerRegistry = {
-            getRunner: jest.fn().mockReturnValue(mockRunner),
+        mockRunnerMap = {
+            [DataProviderFeatureType.SCRAPING]: mockRunner,
+            [DataProviderFeatureType.SEARCH]: mockRunner,
         };
@@ -58,1 +60,1 @@
-                { provide: FeatureRunnerRegistry, useValue: mockRunnerRegistry },
+                { provide: DATA_PROVIDER_FEATURE_RUNNER_MAP, useValue: mockRunnerMap },
```

---

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` - PASS (0 errors)
- **Manual Checks**:
  - `[x]` Đã xóa bỏ hoàn toàn `FeatureRunnerRegistry` và `feature-runner.registry.spec.ts`.
  - `[x]` `DATA_PROVIDER_FEATURE_RUNNER_MAP` đã được đăng ký trong `DataProviderModule` và export đúng chuẩn.
  - `[x]` `DataProviderFeatureService` đã inject `DATA_PROVIDER_FEATURE_RUNNER_MAP` và triển khai helper method `getRunner()` ném `AppException(DataProviderError.RunnerNotFound(type))`.

