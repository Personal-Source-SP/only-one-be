---
status: done
slug: sync-target-config-defaults-and-validation
started_at: 2026-09-10
completed_at: 2026-09-10
pr_url: ~
branch: ~
---

# Plan: Đồng bộ Giá trị Mặc định và Chuẩn hóa Validation TargetConfig giữa Backend & Frontend

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- **Hiện trạng validation**: `target-config-validator.helper.ts` chỉ kiểm tra tối thiểu một số ít trường (`functionGenerator`, `timeout`, `retryAttempts`, `retryDelay`, `waitForTimeout`, `cookies`, `headers`, `searchUrlPattern`, `queryPlaceholder`, `resultSelector`). Các trường `maxResults`, `isGetParentElement`, `stealthMode`, `cloudflareBypass`, `javascriptEnabled`, `imagesEnabled`, `cssEnabled`, `mainContentSelector`, `waitForSelector`, `userAgent`, `queryParams`, `firstQueryParams` chưa được kiểm tra kiểu dữ liệu hoặc giá trị âm/dương.
- **Thiếu Constant tập trung**: Backend chưa có file khai báo `DEFAULT_TARGET_CONFIG` và `DEFAULT_SEARCH_TARGET_CONFIG` đồng bộ với `FE constants.ts`.
- **Hỗ trợ Optional Fields**: Các trường optional cần được phép mang giá trị `undefined` hoặc `null` (chuẩn hóa về `undefined`), không bị ép buộc ghi đè giá trị mặc định vào DB nếu người dùng không cấu hình.
- **Sử dụng Lodash `!isNil`**: Tận dụng hàm `isNil` từ thư viện `lodash` (đã có sẵn trong dự án) thay vì tự viết helper kiểm tra `undefined/null`.
- **Invariants**:
  - `functionGenerator` là trường bắt buộc duy nhất của `IScrapingTargetConfig`, phải là chuỗi không rỗng và cú pháp JS hợp lệ.
  - Mọi trường optional khi mang giá trị `undefined` hoặc `null` đều hợp lệ và được bảo toàn dạng `undefined`.
  - Giữ nguyên hợp đồng `TargetConfigValidatorHelper.validateConfig(rawConfig, type)`.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)
*(Kế thừa 100% cơ chế vận hành từ concept.md; không mô tả lại giải pháp tổng quan)*

- **Type Signatures & Code Contracts**:
  - `DEFAULT_TARGET_CONFIG: DefaultScrapingTargetConfig` tại `src/modules/data-provider/constants/data-provider-config.constant.ts`.
  - `DEFAULT_SEARCH_TARGET_CONFIG: DefaultSearchTargetConfig` tại `src/modules/data-provider/constants/data-provider-config.constant.ts`.
  - Mở rộng logic `TargetConfigValidatorHelper.validateScrapingTargetConfig(rawConfig: unknown): IScrapingTargetConfig` và `TargetConfigValidatorHelper.validateSearchTargetConfig(rawConfig: unknown): ISearchTargetConfig`.

- **AST Seams & Callers**:
  - `target-config-validator.helper.ts`: Cập nhật phương thức `validateScrapingTargetConfig` và `validateSearchTargetConfig` với `isNil` từ `lodash`.
  - `target-config-validator.helper.spec.ts`: Bổ sung test case kiểm tra toàn diện kiểu dữ liệu, các giá trị hợp lệ, các giá trị `undefined`, và các trường hợp ném ngoại lệ khi sai kiểu.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── constants/
│   └── [NEW]    data-provider-config.constant.ts     # Khai báo DEFAULT_TARGET_CONFIG và DEFAULT_SEARCH_TARGET_CONFIG
└── helpers/
    ├── [MODIFY] target-config-validator.helper.ts     # Mở rộng validation toàn diện và hỗ trợ undefined cho optional fields bằng lodash isNil
    └── _tests/
        └── [MODIFY] target-config-validator.helper.spec.ts # Bổ sung unit tests cho optional fields & type validations
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/modules/data-provider/constants/data-provider-config.constant.ts` | `DEFAULT_TARGET_CONFIG`, `DEFAULT_SEARCH_TARGET_CONFIG` | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/helpers/target-config-validator.helper.ts` | `TargetConfigValidatorHelper.validateScrapingTargetConfig`, `TargetConfigValidatorHelper.validateSearchTargetConfig` | `Order 1` | `npm run build` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/helpers/_tests/target-config-validator.helper.spec.ts` | `describe('TargetConfigValidatorHelper')` | `Order 2` | `npm run build` |

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/modules/data-provider/constants/data-provider-config.constant.ts`
> **Action**: Khởi tạo hằng số cấu hình mặc định cho Scraping và Search đồng bộ 1:1 với Frontend.

```typescript
import { IScrapingTargetConfig, ISearchTargetConfig } from '../interfaces';

export const DEFAULT_TARGET_CONFIG: IScrapingTargetConfig = {
    maxResults: 10,
    retryDelay: 1000,
    retryAttempts: 3,
    timeout: 30000,
    waitForTimeout: 5000,
    isGetParentElement: false,
    stealthMode: false,
    cloudflareBypass: false,
    javascriptEnabled: true,
    imagesEnabled: false,
    cssEnabled: false,
};

export const DEFAULT_SEARCH_TARGET_CONFIG: ISearchTargetConfig = {
    ...DEFAULT_TARGET_CONFIG,
    queryPlaceholder: '{query}',
};
```

### 2. `[MODIFY]` `src/modules/data-provider/helpers/target-config-validator.helper.ts`
> **Action**: Bổ sung validation kiểm tra kiểu toàn diện cho mọi trường trong TargetConfig và sử dụng `!isNil` từ `lodash` để đảm bảo các trường optional có thể nhận `undefined`.

```diff
@@ -1,6 +1,7 @@
+import { isNil } from 'lodash';
 import { AppException } from '../../../exceptions/app.exception';
 import { DataProviderError } from '../constants/data-provider-error';
 import { DataProviderFeatureType } from '../enums';
 import { IScrapingTargetConfig, ISearchTargetConfig, TargetConfig } from '../interfaces';
 
 export class TargetConfigValidatorHelper {
     static validateScrapingTargetConfig(rawConfig: unknown): IScrapingTargetConfig {
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
             throw new AppException(DataProviderError.InvalidFeatureConfig(`Cú pháp hàm functionGenerator không hợp lệ: ${message}`));
         }
 
-        if (config.retryAttempts !== undefined && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
+        if (!isNil(config.maxResults) && (typeof config.maxResults !== 'number' || config.maxResults <= 0)) {
+            throw new AppException(DataProviderError.InvalidFeatureConfig('maxResults phải là số nguyên dương (> 0).'));
+        }
+
+        if (!isNil(config.retryAttempts) && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
             throw new AppException(DataProviderError.InvalidFeatureConfig('retryAttempts phải là số nguyên không âm.'));
         }
 
-        if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
+        if (!isNil(config.retryDelay) && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
             throw new AppException(DataProviderError.InvalidFeatureConfig('retryDelay phải là số không âm.'));
         }
 
-        if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
+        if (!isNil(config.timeout) && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
             throw new AppException(DataProviderError.InvalidFeatureConfig('timeout phải là số dương (> 0).'));
         }
 
-        if (config.waitForTimeout !== undefined && (typeof config.waitForTimeout !== 'number' || config.waitForTimeout < 0)) {
+        if (!isNil(config.waitForTimeout) && (typeof config.waitForTimeout !== 'number' || config.waitForTimeout < 0)) {
             throw new AppException(DataProviderError.InvalidFeatureConfig('waitForTimeout phải là số không âm.'));
         }
 
+        const booleanFields: (keyof IScrapingTargetConfig)[] = [
+            'isGetParentElement',
+            'stealthMode',
+            'cloudflareBypass',
+            'javascriptEnabled',
+            'imagesEnabled',
+            'cssEnabled',
+        ];
+        for (const field of booleanFields) {
+            if (!isNil(config[field]) && typeof config[field] !== 'boolean') {
+                throw new AppException(DataProviderError.InvalidFeatureConfig(`${String(field)} phải là kiểu boolean.`));
+            }
+        }
+
+        const stringFields: (keyof IScrapingTargetConfig)[] = [
+            'mainContentSelector',
+            'waitForSelector',
+            'userAgent',
+            'queryParams',
+            'firstQueryParams',
+        ];
+        for (const field of stringFields) {
+            if (!isNil(config[field]) && typeof config[field] !== 'string') {
+                throw new AppException(DataProviderError.InvalidFeatureConfig(`${String(field)} phải là chuỗi ký tự.`));
+            }
+        }
+
-        if (config.cookies !== undefined) {
+        if (!isNil(config.cookies)) {
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
 
-        if (config.headers !== undefined && (typeof config.headers !== 'object' || Array.isArray(config.headers))) {
+        if (!isNil(config.headers) && (typeof config.headers !== 'object' || Array.isArray(config.headers))) {
             throw new AppException(DataProviderError.InvalidFeatureConfig('headers phải là một đối tượng key-value.'));
         }
 
-        return config as IScrapingTargetConfig;
+        const sanitizedConfig: IScrapingTargetConfig = {
+            functionGenerator: config.functionGenerator,
+            ...(!isNil(config.mainContentSelector) ? { mainContentSelector: config.mainContentSelector } : {}),
+            ...(!isNil(config.isGetParentElement) ? { isGetParentElement: config.isGetParentElement } : {}),
+            ...(!isNil(config.queryParams) ? { queryParams: config.queryParams } : {}),
+            ...(!isNil(config.firstQueryParams) ? { firstQueryParams: config.firstQueryParams } : {}),
+            ...(!isNil(config.maxResults) ? { maxResults: config.maxResults } : {}),
+            ...(!isNil(config.retryDelay) ? { retryDelay: config.retryDelay } : {}),
+            ...(!isNil(config.retryAttempts) ? { retryAttempts: config.retryAttempts } : {}),
+            ...(!isNil(config.userAgent) ? { userAgent: config.userAgent } : {}),
+            ...(!isNil(config.headers) ? { headers: config.headers } : {}),
+            ...(!isNil(config.cookies) ? { cookies: config.cookies } : {}),
+            ...(!isNil(config.timeout) ? { timeout: config.timeout } : {}),
+            ...(!isNil(config.waitForTimeout) ? { waitForTimeout: config.waitForTimeout } : {}),
+            ...(!isNil(config.stealthMode) ? { stealthMode: config.stealthMode } : {}),
+            ...(!isNil(config.cloudflareBypass) ? { cloudflareBypass: config.cloudflareBypass } : {}),
+            ...(!isNil(config.waitForSelector) ? { waitForSelector: config.waitForSelector } : {}),
+            ...(!isNil(config.javascriptEnabled) ? { javascriptEnabled: config.javascriptEnabled } : {}),
+            ...(!isNil(config.imagesEnabled) ? { imagesEnabled: config.imagesEnabled } : {}),
+            ...(!isNil(config.cssEnabled) ? { cssEnabled: config.cssEnabled } : {}),
+        };
+
+        return sanitizedConfig;
     }
 
     static validateSearchTargetConfig(rawConfig: unknown): ISearchTargetConfig {
         const baseConfig = this.validateScrapingTargetConfig(rawConfig);
         const searchConfig = rawConfig as Partial<ISearchTargetConfig>;
 
-        if (searchConfig.searchUrlPattern !== undefined && typeof searchConfig.searchUrlPattern !== 'string') {
+        if (!isNil(searchConfig.searchUrlPattern) && typeof searchConfig.searchUrlPattern !== 'string') {
             throw new AppException(DataProviderError.InvalidFeatureConfig('searchUrlPattern phải là chuỗi ký tự.'));
         }
 
-        if (searchConfig.queryPlaceholder !== undefined && typeof searchConfig.queryPlaceholder !== 'string') {
+        if (!isNil(searchConfig.queryPlaceholder) && typeof searchConfig.queryPlaceholder !== 'string') {
             throw new AppException(DataProviderError.InvalidFeatureConfig('queryPlaceholder phải là chuỗi ký tự.'));
         }
 
-        if (searchConfig.resultSelector !== undefined && typeof searchConfig.resultSelector !== 'string') {
+        if (!isNil(searchConfig.resultSelector) && typeof searchConfig.resultSelector !== 'string') {
             throw new AppException(DataProviderError.InvalidFeatureConfig('resultSelector phải là chuỗi ký tự.'));
         }
 
-        return {
+        const sanitizedSearchConfig: ISearchTargetConfig = {
             ...baseConfig,
-            searchUrlPattern: searchConfig.searchUrlPattern,
-            queryPlaceholder: searchConfig.queryPlaceholder,
-            resultSelector: searchConfig.resultSelector,
+            ...(!isNil(searchConfig.searchUrlPattern) ? { searchUrlPattern: searchConfig.searchUrlPattern } : {}),
+            ...(!isNil(searchConfig.queryPlaceholder) ? { queryPlaceholder: searchConfig.queryPlaceholder } : {}),
+            ...(!isNil(searchConfig.resultSelector) ? { resultSelector: searchConfig.resultSelector } : {}),
         };
+
+        return sanitizedSearchConfig;
     }
```

### 3. `[MODIFY]` `src/modules/data-provider/helpers/_tests/target-config-validator.helper.spec.ts`
> **Action**: Cập nhật và bổ sung unit test case cho boolean fields, string fields, undefined optional handling.

```diff
@@ -42,6 +42,38 @@
                 }),
             ).toThrow(AppException);
+
+            expect(() =>
+                TargetConfigValidatorHelper.validateScrapingTargetConfig({
+                    functionGenerator: 'return {};',
+                    maxResults: 0,
+                }),
+            ).toThrow(AppException);
+        });
+
+        it('should throw error when boolean options are invalid', () => {
+            expect(() =>
+                TargetConfigValidatorHelper.validateScrapingTargetConfig({
+                    functionGenerator: 'return {};',
+                    javascriptEnabled: 'yes' as unknown as boolean,
+                }),
+            ).toThrow(AppException);
+        });
+
+        it('should throw error when string selector options are invalid', () => {
+            expect(() =>
+                TargetConfigValidatorHelper.validateScrapingTargetConfig({
+                    functionGenerator: 'return {};',
+                    mainContentSelector: 123 as unknown as string,
+                }),
+            ).toThrow(AppException);
+        });
+
+        it('should allow optional fields to be undefined or null', () => {
+            const config = {
+                functionGenerator: 'return { title: "sample" };',
+                mainContentSelector: undefined,
+                maxResults: null,
+            };
+            const result = TargetConfigValidatorHelper.validateScrapingTargetConfig(config);
+            expect(result.functionGenerator).toBe('return { title: "sample" };');
+            expect(result.mainContentSelector).toBeUndefined();
+            expect(result.maxResults).toBeUndefined();
         });
```

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `npm test -- src/modules/data-provider/helpers/_tests/target-config-validator.helper.spec.ts`
  - `npm test -- src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts`
  - `npm run lint`
- **Manual Checks**:
  - Kiểm tra các runner test sandbox và stateless test với config tối giản `{ functionGenerator: "..." }` chạy trơn tru mà không bị lỗi undefined.
