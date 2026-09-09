---
status: done
slug: data-provider-feature-upgrade
started_at: 2026-09-09
completed_at: 2026-09-09
pr_url: ~
branch: ~
---

# Plan: Nâng Cấp Data Provider Feature Service & Controller

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: 
  - `DataProviderFeatureService.createFeature` (`data-provider-feature.service.ts`) chỉ kiểm tra trùng lặp `exists({ dataProviderId, type })` rồi trực tiếp khởi tạo và persist `DataProviderFeatureEntity` với trạng thái mặc định `UNCONFIGURED`, hoàn toàn bỏ qua việc kiểm tra tính đúng đắn của cấu hình đối với dữ liệu thực tế.
  - Endpoint `testStateless` (`data-provider-feature.controller.ts`) gọi `FeatureRunnerRegistry` và trả về toàn bộ danh sách `data` trích xuất được từ crawler/searcher mà không có giới hạn, gây phình to payload preview trên frontend.
  - Các route trong `DataProviderFeatureController` mang tiền tố dư thừa `data-providers/:dataProviderId` (trùng lặp với context của controller `@Controller('data-provider-features')`), đồng thời frontend (`only-one-fe`) đang gọi hardcoded endpoint này tại `endpoint.ts`, `ScrapingConfigForm`, và `SearchConfigForm`.
- **Invariants bắt buộc duy trì**:
  - `DataProviderFeatureEntity` duy trì unique constraint `['dataProviderId', 'type']`.
  - Nếu `request.input` không được truyền vào khi gọi `createFeature`, hệ thống vẫn cho phép tạo feature ở trạng thái draft (`UNCONFIGURED`) mà không bắt buộc phải có network call kiểm thử.
  - `FeatureRunnerRegistry` và các Runner (`ScrapingFeatureRunner`, `SearchFeatureRunner`) giữ nguyên contract `testStateless(service, config, input)`.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

### 2.1 Type Signatures & Code Contracts

- **`CreateDataProviderFeatureRequestDto`** (`data-provider-feature-request.dto.ts`):
  ```typescript
  export class CreateDataProviderFeatureRequestDto {
      @EnumField(() => DataProviderFeatureType, { description: 'Type of feature' })
      type: DataProviderFeatureType;

      @EnumFieldOptional(() => ScraperServiceEnum, {
          default: ScraperServiceEnum.GENERIC,
          description: 'Service runtime identifier',
      })
      service?: ScraperServiceEnum;

      @ObjectFieldOptional({ description: 'Feature configuration payload' })
      config?: Record<string, unknown>;

      @ObjectFieldOptional({ description: 'Test input payload to verify feature before creating' })
      input?: Record<string, unknown>;
  }
  ```

- **`DataProviderFeatureService.createFeature` Contract**:
  ```typescript
  async createFeature(dataProviderId: string, request: CreateDataProviderFeatureRequestDto): Promise<DataProviderFeatureDto>
  ```
  *Pre-condition*: Nếu `request.input` có giá trị $\rightarrow$ thực thi `runner.testStateless(request.service, request.config, request.input)`. Nếu runner fail (ném exception hoặc trả error) $\rightarrow$ propagate error, hủy thao tác tạo. Nếu thành công $\rightarrow$ khởi tạo entity với status `DataProviderFeatureStatus.READY` (hoặc `DataProviderFeatureStatus.TESTING`).

- **`DataProviderFeatureController.testStateless` Response Constraint**:
  Giới hạn mảng trích xuất `result.data` tối đa 3 items: `result.data = result.data.slice(0, 3)`.

### 2.2 AST Seams & Callers

- **Backend (`only-one-be`)**:
  - `data-provider-feature-request.dto.ts`: Thêm trường `input` vào `CreateDataProviderFeatureRequestDto`.
  - `data-provider-feature.service.ts`: Phương thức `createFeature()` tích hợp pre-test execution qua `this.runnerRegistry`.
  - `data-provider-feature.controller.ts`: 
    - Sửa Decorator route: `data-providers/:dataProviderId` $\rightarrow$ `provider/:dataProviderId`.
    - Phương thức `testStateless`: Truncate mảng `data` về $\le 3$ phần tử trước khi trả về.
- **Frontend (`only-one-fe`)**:
  - `src/config/endpoint.ts`: Sửa `API_ENDPOINT.DATA_PROVIDER_FEATURES.BY_PROVIDER` trỏ đến `provider/:dataProviderId`.
  - `ScrapingConfigForm/index.tsx`: Sửa url tạo mới từ `data-providers/...` $\rightarrow$ `provider/${feature.dataProviderId}`.
  - `SearchConfigForm/index.tsx`: Sửa url tạo mới từ `data-providers/...` $\rightarrow$ `provider/${feature.dataProviderId}`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
only-one-be/src/modules/data-provider/
├── dtos/requests/
│   └── [MODIFY] data-provider-feature-request.dto.ts   # Thêm input field vào CreateDataProviderFeatureRequestDto
├── services/
│   └── [MODIFY] data-provider-feature.service.ts       # Chạy runner testStateless nếu có input trước khi save
└── controllers/
    └── [MODIFY] data-provider-feature.controller.ts    # Tinh gọn route paths và slice top 3 kết quả test

only-one-fe/src/
├── config/
│   └── [MODIFY] endpoint.ts                            # Cập nhật endpoint BY_PROVIDER
└── app/(root)/scraping/features/[dataProviderId]/components/
    ├── [MODIFY] ScrapingConfigForm/index.tsx           # Đồng bộ endpoint tạo mới feature
    └── [MODIFY] SearchConfigForm/index.tsx             # Đồng bộ endpoint tạo mới feature
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts` | `CreateDataProviderFeatureRequestDto.input` | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts` | `DataProviderFeatureService.createFeature` | `Order 1` | `npm run build` |
| **3** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts` | `DataProviderFeatureController` routes & `testStateless` | `Order 2` | `npm run build` |
| **4** | `[x]` | `[MODIFY]` | `only-one-fe/src/config/endpoint.ts` | `API_ENDPOINT.DATA_PROVIDER_FEATURES` | `Order 3` | `npx eslint src/config/endpoint.ts` |
| **5** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/components/ScrapingConfigForm/index.tsx` | `ScrapingConfigForm.handleSave` | `Order 4` | `npx eslint "src/**/*.{ts,tsx}"` |
| **6** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/components/SearchConfigForm/index.tsx` | `SearchConfigForm.handleSave` | `Order 4` | `npx eslint "src/**/*.{ts,tsx}"` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `only-one-be/src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts`
> **Action**: Bổ sung trường `input` vào `CreateDataProviderFeatureRequestDto`.

```diff
@@ -14,6 +14,9 @@ export class CreateDataProviderFeatureRequestDto {
     @ObjectFieldOptional({ description: 'Feature configuration payload' })
     config?: Record<string, unknown>;
+
+    @ObjectFieldOptional({ description: 'Test input payload to verify feature before creating' })
+    input?: Record<string, unknown>;
 }
 
 export class UpdateFeatureConfigRequestDto {
```

---

### 2. `[MODIFY]` `only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts`
> **Action**: Thực thi kiểm thử `testStateless` trước khi tạo feature nếu có `input`.

```diff
@@ -42,12 +42,18 @@ export class DataProviderFeatureService extends BaseService<DataProviderFeatureE
             throw new AppException(DataProviderError.FeatureAlreadyExists(request.type, dataProviderId));
         }
 
+        if (request.input) {
+            const runner = this.runnerRegistry.getRunner(request.type);
+            await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
+        }
+
         const entity = this.dataProviderFeatureRepository.create({
             dataProviderId,
             type: request.type,
             config: request.config,
             service: request.service || ScraperServiceEnum.GENERIC,
+            status: request.input ? DataProviderFeatureStatus.READY : DataProviderFeatureStatus.UNCONFIGURED,
         });
 
         return await super.create(entity);
     }
```

---

### 3. `[MODIFY]` `only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts`
> **Action**: Cắt ngắn kết quả test tối đa 3 items và loại bỏ tiền tố `data-providers` khỏi path.

```diff
@@ -25,7 +25,7 @@ export class DataProviderFeatureController {
     }
 
     @Get({
-        path: 'data-providers/:dataProviderId',
+        path: 'provider/:dataProviderId',
         summary: 'Get all features by provider ID',
         responseDto: [DataProviderFeatureDto],
     })
@@ -34,7 +34,7 @@ export class DataProviderFeatureController {
     }
 
     @Get({
-        path: 'data-providers/:dataProviderId/:type',
+        path: 'provider/:dataProviderId/:type',
         summary: 'Get feature by provider ID and type',
         responseDto: DataProviderFeatureDto,
     })
@@ -58,11 +58,15 @@ export class DataProviderFeatureController {
     })
     async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<any> {
         const runner = this.runnerRegistry.getRunner(request.type);
-        return await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
+        const result = await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
+        if (result && Array.isArray(result.data)) {
+            result.data = result.data.slice(0, 3);
+        }
+        return result;
     }
 
     @Post({
-        path: 'data-providers/:dataProviderId',
+        path: 'provider/:dataProviderId',
         summary: 'Create feature for a data provider',
         responseDto: DataProviderFeatureDto,
     })
```

---

### 4. `[MODIFY]` `only-one-fe/src/config/endpoint.ts`
> **Action**: Cập nhật endpoint `BY_PROVIDER` theo route mới `provider/:providerId`.

```diff
@@ -21,7 +21,7 @@ export const API_ENDPOINT = {
         BASE: prefix('data-provider-features'),
         ALL: prefix('data-provider-features/all'),
         BY_PROVIDER: (providerId: string | number) =>
-            prefix(`data-provider-features/data-providers/${providerId}`),
+            prefix(`data-provider-features/provider/${providerId}`),
         DETAIL: (id: string | number) => prefix(`data-provider-features/${id}`),
         TEST: prefix('data-provider-features/test'),
     },
```

---

### 5. `[MODIFY]` `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/components/ScrapingConfigForm/index.tsx`
> **Action**: Cập nhật endpoint tạo mới feature trong `ScrapingConfigForm`.

```diff
@@ -97,7 +97,7 @@ export const ScrapingConfigForm = ({
             const method = isDraft ? 'post' : 'put';
             const endpoint = isDraft
-                ? `data-provider-features/data-providers/${feature.dataProviderId}`
+                ? `data-provider-features/provider/${feature.dataProviderId}`
                 : `data-provider-features/${feature.id}`;
 
             const payload: Record<string, any> = {
```

---

### 6. `[MODIFY]` `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/components/SearchConfigForm/index.tsx`
> **Action**: Cập nhật endpoint tạo mới feature trong `SearchConfigForm`.

```diff
@@ -93,7 +93,7 @@ export const SearchConfigForm = ({
             const method = isDraft ? 'post' : 'put';
             const endpoint = isDraft
-                ? `data-provider-features/data-providers/${feature.dataProviderId}`
+                ? `data-provider-features/provider/${feature.dataProviderId}`
                 : `data-provider-features/${feature.id}`;
 
             const payload: Record<string, any> = {
```

---

## Section 5. Test Cases & Verification

### Automated Tests
- **Backend Build (`only-one-be`)**:
  ```bash
  npm run build
  ```
  *Evidence*: `rimraf dist && tsc -p tsconfig.build.json && nest build` - Exit code 0 (Success).
- **Backend Lint (`only-one-be`)**:
  ```bash
  ESLINT_USE_FLAT_CONFIG=false npm run lint
  ```
  *Evidence*: Exit code 0 (0 errors, 0 warnings).
- **Frontend Lint (`only-one-fe`)**:
  ```bash
  npx eslint "src/**/*.{ts,tsx}"
  ```
  *Evidence*: Exit code 0 (0 errors, 0 warnings).

### Manual Verification Matrix
- [x] **Tạo Feature có `input` hợp lệ**: `createFeature` gọi `runner.testStateless` thành công, lưu entity với status `READY`.
- [x] **Tạo Feature có `input` không hợp lệ**: Ném exception và hủy quá trình tạo feature (fail-fast).
- [x] **Giới hạn 3 kết quả**: `testStateless` tự động `slice(0, 3)` mảng `data` trong response.
- [x] **Đồng bộ Route Paths**: Các route `provider/:dataProviderId` hoạt động chính xác và được cập nhật tương ứng trên frontend (`endpoint.ts`, `ScrapingConfigForm`, `SearchConfigForm`).
