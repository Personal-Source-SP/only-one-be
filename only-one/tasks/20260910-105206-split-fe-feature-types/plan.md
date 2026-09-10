---
status: done
slug: 20260910-105206-split-fe-feature-types
started_at: 2026-09-10
completed_at: 2026-09-10
pr_url: ~
branch: ~
---

# Plan: Tách Nhỏ Types theo Đối Tượng & Tái Cấu Trúc Thư Mục Module Scraping Features Đồng Bộ Backend

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- **Monolithic Types & Dead Code**: Tệp `types.ts` tại `src/app/(root)/scraping/features/[dataProviderId]/types.ts` chứa hỗn hợp tất cả các đối tượng và chứa type chết không còn sử dụng (`TestFeatureContextualRequest`). Trường `service` bị gán lỏng lẻo `string`, `UpdateFeatureConfigRequest` sai lệch với BE DTO (`changeDescription` bị optional, chứa `service` thừa), và thiếu các interface chi tiết cho `ITargetConfig`, `ISearchTargetConfig`.
- **Nested Folder Structure**: Toàn bộ `components/`, `enums/`, `hooks/`, `utils/`, `constants.ts` bị đặt lồng sâu bên trong dynamic route segment `[dataProviderId]/` thay vì ở cấp module cha `src/app/(root)/scraping/features/`, gây lệch chuẩn kiến trúc so với module `discovery/`.
- **Invariants bảo tồn**:
  - Tuyệt đối không thay đổi Next.js Dynamic URL route `/scraping/features/:dataProviderId`.
  - Re-export đầy đủ các types qua `types/index.ts` để giữ tương thích 100% cho mọi import hiện hữu.
  - Giữ nguyên các hàm helper và metadata registry (`FEATURE_TYPE_METADATA`, `getFeatureDefinition`).

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

### Type Signatures & Code Contracts

#### 1. `target-config.types.ts` (Sync 100% từ BE `target-config.interface.ts`)
```typescript
export interface ITargetConfig {
    functionGenerator: string;

    mainContentSelector?: string;
    isGetParentElement?: boolean;
    queryParams?: string;
    firstQueryParams?: string;
    maxResults?: number;
    retryDelay?: number;
    retryAttempts?: number;
    userAgent?: string;
    headers?: Record<string, string>;
    cookies?: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
    }>;
    timeout?: number;
    waitForTimeout?: number;
    stealthMode?: boolean;
    cloudflareBypass?: boolean;
    waitForSelector?: string;
    javascriptEnabled?: boolean;
    imagesEnabled?: boolean;
    cssEnabled?: boolean;
}

export interface ISearchTargetConfig extends ITargetConfig {
    searchUrlPattern?: string;
    queryPlaceholder?: string;
    resultSelector?: string;
    sampleQuery?: string;
}

export interface IRunFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
}

export interface IRunApiFunctionExtractData {
    data: Record<string, any>;
    functionGenerator: string;
}

export interface IRunSearchFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    resultSelector?: string;
    maxResults?: number;
    mainContentSelector?: string;
    isGetParentElement?: boolean;
}

export interface IRunApiSearchFunctionExtractData {
    data: Record<string, any>;
    functionGenerator: string;
    maxResults?: number;
}

export interface ISearchExtractDataResponse {
    html?: string;
    error?: string;
    data?: Array<Record<string, any>>;
}
```

#### 2. `config-version.types.ts`
```typescript
import type { IUser } from '@/app/(root)/setting/users/types';
import type { Abstract } from '@/interfaces';
import type { ConfigVersionType } from '../enums';
import type { IDataProviderFeature } from './data-provider-feature.types';

export interface IConfigVersion extends Abstract {
    featureId: string;
    isActive: boolean;
    versionId: number;
    config: Record<string, any>;
    changeType: ConfigVersionType;
    changeDescription?: string;
    createdBy?: string;
    user?: IUser;
    feature?: IDataProviderFeature;
}

export interface HistoryModalState {
    open: boolean;
    feature: IDataProviderFeature | null;
}
```

#### 3. `data-provider-feature.types.ts`
```typescript
import type { IDataProvider } from '@/app/(root)/scraping/data-providers/types';
import type { Abstract } from '@/interfaces';
import type {
    DataProviderFeatureErrorType,
    DataProviderFeatureStatus,
    DataProviderFeatureType,
    ScraperServiceEnum,
} from '../enums';
import type { IConfigVersion } from './config-version.types';
import type { ISearchTargetConfig, ITargetConfig } from './target-config.types';

export interface IDataProviderFeature extends Abstract {
    dataProviderId: string;
    type: DataProviderFeatureType;
    service: ScraperServiceEnum;
    status: DataProviderFeatureStatus;
    consecutiveFailures: number;

    config?: Record<string, any>;
    lastErrorMessage?: string;
    lastErrorType?: DataProviderFeatureErrorType;
    lastFailedRunAt?: Date;
    lastSuccessfulRunAt?: Date;
    dataProvider?: IDataProvider;
    versions?: IConfigVersion[];
}

export interface CreateDataProviderFeatureRequest {
    type: DataProviderFeatureType;
    service: ScraperServiceEnum;
    config?: Record<string, any>;
    input?: Record<string, any>;
}

export interface UpdateFeatureConfigRequest {
    changeDescription: string;
    config?: Record<string, any>;
    input?: Record<string, any>;
}

export interface TestFeatureStatelessRequest {
    type: DataProviderFeatureType;
    config: Record<string, any>;
    service?: ScraperServiceEnum;
    input?: Record<string, any>;
}

export type FeatureModalTab = 'config' | 'test';

export interface FeatureModalState {
    open: boolean;
    feature: IDataProviderFeature | null;
    activeTab: FeatureModalTab;
}
```

### AST Seams & Callers
- **`src/app/(root)/scraping/features/[dataProviderId]/page.tsx`**: Cập nhật import paths từ `./enums`, `./utils`, `./components`, `./hooks`, `./types` thành `../enums`, `../utils`, `../components`, `../hooks`, `../types`.
- **`src/app/(root)/scraping/features/hooks/useDataProviderFeatureActions.ts`**: Cập nhật payload gọi update config đảm bảo `changeDescription` đúng type contract.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
src/app/(root)/scraping/features/
├── [dataProviderId]/
│   ├── [MODIFY] page.tsx
│   └── [DELETE] types.ts
├── [NEW] types/
│   ├── [NEW] target-config.types.ts
│   ├── [NEW] config-version.types.ts
│   ├── [NEW] data-provider-feature.types.ts
│   └── [NEW] index.ts
├── [MOVE] components/
├── [MOVE] constants.ts
├── [MOVE] enums/
├── [MOVE] hooks/
└── [MOVE] utils/
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/app/(root)/scraping/features/types/target-config.types.ts` | `ITargetConfig`, `ISearchTargetConfig`, `IRunFunctionExtractData`, `ISearchExtractDataResponse` | `None` | `npx tsc --noEmit` |
| **2** | `[x]` | `[NEW]` | `src/app/(root)/scraping/features/types/config-version.types.ts` | `IConfigVersion`, `HistoryModalState` | `None` | `npx tsc --noEmit` |
| **3** | `[x]` | `[NEW]` | `src/app/(root)/scraping/features/types/data-provider-feature.types.ts` | `IDataProviderFeature`, `CreateDataProviderFeatureRequest`, `UpdateFeatureConfigRequest`, `TestFeatureStatelessRequest`, `FeatureModalState` | `Order 1, 2` | `npx tsc --noEmit` |
| **4** | `[x]` | `[NEW]` | `src/app/(root)/scraping/features/types/index.ts` | Barrel exports for all types | `Order 1, 2, 3` | `npx tsc --noEmit` |
| **5** | `[x]` | `[MOVE]` | `src/app/(root)/scraping/features/components` | Move `components/` from `[dataProviderId]/` to `features/` | `None` | `npx tsc --noEmit` |
| **6** | `[x]` | `[MOVE]` | `src/app/(root)/scraping/features/constants.ts` | Move `constants.ts` from `[dataProviderId]/` to `features/` | `None` | `npx tsc --noEmit` |
| **7** | `[x]` | `[MOVE]` | `src/app/(root)/scraping/features/enums` | Move `enums/` from `[dataProviderId]/` to `features/` | `None` | `npx tsc --noEmit` |
| **8** | `[x]` | `[MOVE]` | `src/app/(root)/scraping/features/hooks` | Move `hooks/` from `[dataProviderId]/` to `features/` | `None` | `npx tsc --noEmit` |
| **9** | `[x]` | `[MOVE]` | `src/app/(root)/scraping/features/utils` | Move `utils/` from `[dataProviderId]/` to `features/` | `None` | `npx tsc --noEmit` |
| **10** | `[x]` | `[MODIFY]` | `src/app/(root)/scraping/features/[dataProviderId]/page.tsx` | Update import paths to parent directory (`../`) | `Order 4, 5, 6, 7, 8, 9` | `npx tsc --noEmit` |
| **11** | `[x]` | `[DELETE]` | `src/app/(root)/scraping/features/[dataProviderId]/types.ts` | Remove legacy monolithic types file | `Order 10` | `npx tsc --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/app/(root)/scraping/features/types/target-config.types.ts`
> **Action**: Tạo file định nghĩa interface cho Target Configuration và Extract Runner đồng bộ 100% từ BE.

```typescript
export interface ITargetConfig {
    functionGenerator: string;

    mainContentSelector?: string;
    isGetParentElement?: boolean;
    queryParams?: string;
    firstQueryParams?: string;
    maxResults?: number;
    retryDelay?: number;
    retryAttempts?: number;
    userAgent?: string;
    headers?: Record<string, string>;
    cookies?: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
    }>;
    timeout?: number;
    waitForTimeout?: number;
    stealthMode?: boolean;
    cloudflareBypass?: boolean;
    waitForSelector?: string;
    javascriptEnabled?: boolean;
    imagesEnabled?: boolean;
    cssEnabled?: boolean;
}

export interface ISearchTargetConfig extends ITargetConfig {
    searchUrlPattern?: string;
    queryPlaceholder?: string;
    resultSelector?: string;
    sampleQuery?: string;
}

export interface IRunFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
}

export interface IRunApiFunctionExtractData {
    data: Record<string, any>;
    functionGenerator: string;
}

export interface IRunSearchFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    resultSelector?: string;
    maxResults?: number;
    mainContentSelector?: string;
    isGetParentElement?: boolean;
}

export interface IRunApiSearchFunctionExtractData {
    data: Record<string, any>;
    functionGenerator: string;
    maxResults?: number;
}

export interface ISearchExtractDataResponse {
    html?: string;
    error?: string;
    data?: Array<Record<string, any>>;
}
```

### 2. `[NEW]` `src/app/(root)/scraping/features/types/config-version.types.ts`
> **Action**: Tạo file định nghĩa interface cho Config Version Entity và History Modal State.

```typescript
import type { IUser } from '@/app/(root)/setting/users/types';
import type { Abstract } from '@/interfaces';
import type { ConfigVersionType } from '../enums';
import type { IDataProviderFeature } from './data-provider-feature.types';

export interface IConfigVersion extends Abstract {
    featureId: string;
    isActive: boolean;
    versionId: number;
    config: Record<string, any>;
    changeType: ConfigVersionType;
    changeDescription?: string;
    createdBy?: string;
    user?: IUser;
    feature?: IDataProviderFeature;
}

export interface HistoryModalState {
    open: boolean;
    feature: IDataProviderFeature | null;
}
```

### 3. `[NEW]` `src/app/(root)/scraping/features/types/data-provider-feature.types.ts`
> **Action**: Tạo file định nghĩa interface cho Data Provider Feature Entity, Request DTOs, và Modal State (đã loại bỏ type chết `TestFeatureContextualRequest`).

```typescript
import type { IDataProvider } from '@/app/(root)/scraping/data-providers/types';
import type { Abstract } from '@/interfaces';
import type {
    DataProviderFeatureErrorType,
    DataProviderFeatureStatus,
    DataProviderFeatureType,
    ScraperServiceEnum,
} from '../enums';
import type { IConfigVersion } from './config-version.types';
import type { ISearchTargetConfig, ITargetConfig } from './target-config.types';

export interface IDataProviderFeature extends Abstract {
    dataProviderId: string;
    type: DataProviderFeatureType;
    service: ScraperServiceEnum;
    status: DataProviderFeatureStatus;
    consecutiveFailures: number;

    config?: Record<string, any>;
    lastErrorMessage?: string;
    lastErrorType?: DataProviderFeatureErrorType;
    lastFailedRunAt?: Date;
    lastSuccessfulRunAt?: Date;
    dataProvider?: IDataProvider;
    versions?: IConfigVersion[];
}

export interface CreateDataProviderFeatureRequest {
    type: DataProviderFeatureType;
    service: ScraperServiceEnum;
    config?: Record<string, any>;
    input?: Record<string, any>;
}

export interface UpdateFeatureConfigRequest {
    changeDescription: string;
    config?: Record<string, any>;
    input?: Record<string, any>;
}

export interface TestFeatureStatelessRequest {
    type: DataProviderFeatureType;
    config: Record<string, any>;
    service?: ScraperServiceEnum;
    input?: Record<string, any>;
}

export type FeatureModalTab = 'config' | 'test';

export interface FeatureModalState {
    open: boolean;
    feature: IDataProviderFeature | null;
    activeTab: FeatureModalTab;
}
```

### 4. `[NEW]` `src/app/(root)/scraping/features/types/index.ts`
> **Action**: Re-export toàn bộ types để đảm bảo barrel export chuẩn hóa.

```typescript
export * from './config-version.types';
export * from './data-provider-feature.types';
export * from './target-config.types';
```

### 5. `[MODIFY]` `src/app/(root)/scraping/features/[dataProviderId]/page.tsx`
> **Action**: Cập nhật import relative paths từ `./` sang `../`.

```diff
@@ -22,7 +22,7 @@
-import { DataProviderFeatureType } from './enums';
-import { FEATURE_TYPE_METADATA } from './utils';
-import { FeatureCard, FeatureHistoryModal, FeatureSettingModal } from './components';
-import { useDataProviderFeatureActions, useDataProviderFeaturesView } from './hooks';
-import type { FeatureModalTab } from './types';
+import { DataProviderFeatureType } from '../enums';
+import { FEATURE_TYPE_METADATA } from '../utils';
+import { FeatureCard, FeatureHistoryModal, FeatureSettingModal } from '../components';
+import { useDataProviderFeatureActions, useDataProviderFeaturesView } from '../hooks';
+import type { FeatureModalTab } from '../types';
```

### 6. `[DELETE]` `src/app/(root)/scraping/features/[dataProviderId]/types.ts`
> **Action**: Xóa file monolithic `types.ts` cũ sau khi đã chuyển đổi sang `src/app/(root)/scraping/features/types/`.

---

## Section 5. Test Cases & Verification

- **Automated Verification**:
  - [x] Chạy kiểm tra Type-check trên toàn dự án Frontend:
    ```bash
    cd /Users/kiem/Sources/PERSONAL/only-one-fe && npx tsc --noEmit
    # Output: PASS - exit code 0, no type errors
    ```
  - [x] Chạy linter:
    ```bash
    cd /Users/kiem/Sources/PERSONAL/only-one-fe && npx eslint "src/app/(root)/scraping/features/**/*.{ts,tsx}"
    # Output: PASS - exit code 0, no lint errors
    ```
- **Manual Checks**:
  - [x] Cấu trúc thư mục `src/app/(root)/scraping/features` đồng nhất với `discovery/`.
  - [x] `[dataProviderId]/page.tsx` giữ nguyên route Next.js động.
