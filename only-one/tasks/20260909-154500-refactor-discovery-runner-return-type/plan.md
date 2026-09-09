---
status: done
slug: refactor-discovery-runner-return-type
started_at: 2026-09-09
completed_at: 2026-09-09
pr_url: ~
branch: ~
---

# Plan: Refactor DiscoveryRunner Methods Return Type & Request Parameters

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- Trong `discovery.runner.ts`, hai phương thức `runApiDiscovery` và `runHtmlDiscovery` đang sử dụng cơ chế gom kết quả thông qua đột biến mảng truyền vào (`discoveredRecords.push(...)`) với kiểu trả về `Promise<void>`.
- Danh sách tham số đang ở dạng positional arguments `(session, targetConfig, targetKeyword, discoveredRecords)`, khiến chữ ký hàm cồng kềnh và khó mở rộng các options trong tương lai.
- **Invariants bảo toàn**:
  - Giới hạn `session.maxUrls` và `session.depth` phải tiếp tục được kiểm soát chặt chẽ trong vòng lặp thu thập.
  - Điểm số đánh giá `DiscoveryValidationHelper.evaluateUrl` và trạng thái `DiscoveryValidationStatus.COMPLETED` của từng URL Entity không thay đổi.
  - Cơ chế batching save `this.discoveryUrlRepository.save(discoveredRecords, { chunk: 100 })` và trigger `startBatchValidation` khi `session.autoValidate = true` tiếp tục giữ nguyên.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

- **Type Signatures & Code Contracts**:
  - Định nghĩa interface `IRunDiscoveryParams` tại `discovery-runner.interface.ts`:
    ```typescript
    export interface IRunDiscoveryParams {
        session: DiscoverySessionEntity;
        targetConfig?: ITargetConfig;
        targetKeyword?: string;
    }
    ```
  - Cập nhật chữ ký hàm trong `discovery.runner.ts`:
    ```typescript
    private async runApiDiscovery(params: IRunDiscoveryParams): Promise<DiscoveryUrlEntity[]>;
    private async runHtmlDiscovery(params: IRunDiscoveryParams): Promise<DiscoveryUrlEntity[]>;
    ```

- **AST Seams & Callers**:
  - `DiscoveryRunner.runDiscovery` (`src/modules/data-provider/runners/discovery.runner.ts:L54-L64`): Gọi `runApiDiscovery` hoặc `runHtmlDiscovery` truyền tham số object `params`, nhận về `discoveredRecords` kiểu `DiscoveryUrlEntity[]`.
  - `DiscoveryRunner.runApiDiscovery` (`src/modules/data-provider/runners/discovery.runner.ts:L101-L167`): Khởi tạo mảng `discoveredRecords: DiscoveryUrlEntity[] = []` cục bộ và trả về ở cuối hàm hoặc khi rỗng.
  - `DiscoveryRunner.runHtmlDiscovery` (`src/modules/data-provider/runners/discovery.runner.ts:L169-L242`): Khởi tạo mảng `discoveredRecords: DiscoveryUrlEntity[] = []` cục bộ và trả về ở cuối hàm.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── interfaces/
│   └── [MODIFY] discovery-runner.interface.ts   # Khai báo IRunDiscoveryParams
└── runners/
    └── [MODIFY] discovery.runner.ts             # Refactor tham số dạng object và return DiscoveryUrlEntity[]
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/discovery-runner.interface.ts` | `IRunDiscoveryParams` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/discovery.runner.ts` | `DiscoveryRunner.runDiscovery`, `DiscoveryRunner.runApiDiscovery`, `DiscoveryRunner.runHtmlDiscovery` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/interfaces/discovery-runner.interface.ts`
> **Action**: Bổ sung interface `IRunDiscoveryParams` để gom nhóm các tham số cấu hình khi thực thi discovery.

```diff
@@ -1,3 +1,6 @@
+import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
+import { ITargetConfig } from './target-config.interface';
+
 export interface IDiscoveryFetchHtmlResult {
     html: string;
     title?: string;
@@ -13,3 +16,9 @@
     title?: string;
     description?: string;
 }
+
+export interface IRunDiscoveryParams {
+    session: DiscoverySessionEntity;
+    targetConfig?: ITargetConfig;
+    targetKeyword?: string;
+}
```

### 2. `[MODIFY]` `src/modules/data-provider/runners/discovery.runner.ts`
> **Action**: Refactor `runApiDiscovery` và `runHtmlDiscovery` sang nhận object `IRunDiscoveryParams`, trả về `Promise<DiscoveryUrlEntity[]>`, cập nhật caller tại `runDiscovery`.

```diff
@@ -17,7 +17,13 @@
 import { ExtractDataHelper } from '../helpers/extract-data.helper';
-import { IDiscoveryCrawlQueueItem, IDiscoveryExtractedItem, IDiscoveryFetchHtmlResult, ITargetConfig } from '../interfaces';
+import {
+    IDiscoveryCrawlQueueItem,
+    IDiscoveryExtractedItem,
+    IDiscoveryFetchHtmlResult,
+    IRunDiscoveryParams,
+    ITargetConfig,
+} from '../interfaces';
 import { DiscoveryValidationService } from '../services/discovery-validation.service';
 import { ScraperService } from '../services/scraper.service';
 import { AppException } from '../../../exceptions/app.exception';
 import { DataProviderError } from '../constants/data-provider-error';
@@ -46,7 +52,7 @@
         const searchFeature = session.dataProvider?.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
-        if (!searchFeature) throw new AppException(DataProviderError.SearchFeatureMissing());
+        if (!searchFeature) throw new AppException(DataProviderError.FeatureTypeNotFound(DataProviderFeatureType.SEARCH, session.dataProviderId));
 
         const startTime = Date.now();
 
         // Update session status to IN_PROGRESS when first job is processed
         await this.discoverySessionRepository.update(sessionId, { status: DiscoverySessionStatus.IN_PROGRESS });
 
         try {
-            const discoveredRecords: DiscoveryUrlEntity[] = [];
             const targetConfig = searchFeature?.config as ITargetConfig;
             const isApiProvider = searchFeature?.service === ScraperServiceEnum.API;
+            const params: IRunDiscoveryParams = {
+                session,
+                targetConfig,
+                targetKeyword,
+            };
 
-            if (isApiProvider) {
-                await this.runApiDiscovery(session, targetConfig, targetKeyword, discoveredRecords);
-            } else {
-                await this.runHtmlDiscovery(session, targetConfig, targetKeyword, discoveredRecords);
-            }
+            const discoveredRecords: DiscoveryUrlEntity[] = isApiProvider
+                ? await this.runApiDiscovery(params)
+                : await this.runHtmlDiscovery(params);
 
             if (discoveredRecords.length > 0) {
                 await this.discoveryUrlRepository.save(discoveredRecords, { chunk: 100 });
             }
@@ -101,10 +107,8 @@
     }
 
     private async runApiDiscovery(
-        session: DiscoverySessionEntity,
-        targetConfig: ITargetConfig | undefined,
-        targetKeyword: string | undefined,
-        discoveredRecords: DiscoveryUrlEntity[],
-    ): Promise<void> {
+        params: IRunDiscoveryParams,
+    ): Promise<DiscoveryUrlEntity[]> {
+        const { session, targetConfig, targetKeyword } = params;
        const discoveredRecords: DiscoveryUrlEntity[] = [];
         if (!targetConfig?.functionGenerator) {
             throw new Error(`Data provider feature is missing 'functionGenerator' configuration for session ${session.id}`);
         }
@@ -128,3 +132,3 @@
         if (!Array.isArray(result) || result.length === 0) {
             this.logger.warn(`API functionGenerator returned 0 items for session ${session.id}`);
-            return;
+            return discoveredRecords;
         }
@@ -165,3 +169,5 @@
             discoveredRecords.push(urlEntity);
         }
+
+        return discoveredRecords;
     }
@@ -169,10 +175,9 @@
     private async runHtmlDiscovery(
-        session: DiscoverySessionEntity,
-        targetConfig: ITargetConfig | undefined,
-        targetKeyword: string | undefined,
-        discoveredRecords: DiscoveryUrlEntity[],
-    ): Promise<void> {
+        params: IRunDiscoveryParams,
+    ): Promise<DiscoveryUrlEntity[]> {
+        const { session, targetConfig, targetKeyword } = params;
+        const discoveredRecords: DiscoveryUrlEntity[] = [];
         const visited = new Set<string>();
         const queue: IDiscoveryCrawlQueueItem[] = [{ url: session.targetUrl, depth: 0 }];
@@ -241,3 +246,5 @@
             }
         }
+
+        return discoveredRecords;
     }
```

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `[x]` Typecheck & compilation: `npx tsc -p tsconfig.build.json --noEmit` (PASS - Exit code 0, 0 errors)
  - `[x]` Code linting & formatting: `ESLINT_USE_FLAT_CONFIG=false npx eslint src/modules/data-provider/runners/discovery.runner.ts src/modules/data-provider/interfaces/discovery-runner.interface.ts` (PASS - Exit code 0, 0 errors)
- **Manual Checks**:
  - `[x]` Rà soát AST seams và signature của `runApiDiscovery` / `runHtmlDiscovery` đảm bảo trả về mảng `DiscoveryUrlEntity[]` thuần túy, loại bỏ hoàn toàn side effect gom mảng mutable.

