---
status: done
slug: remove-contextual-test-mode-be
started_at: 2026-09-07
completed_at: 2026-09-07
pr_url: ~
branch: ~
---

# Plan: Loại Bỏ Chế Độ Contextual Test Ở Backend (Data Provider Feature)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- Module `data-provider` đang duy trì 2 endpoint kiểm thử feature: `POST data-provider-features/test` (Stateless runner sandbox) và `POST data-provider-features/:id/test` (Contextual test phụ thuộc entity DB).
- Chế độ Contextual test tạo thêm overhead do phải query DB, load version active và qua trung gian `DataProviderFeatureService.testFeature`, trong khi toàn bộ logic kiểm thử đã được đáp ứng trọn vẹn bởi `testStateless`.
- **Invariants bắt buộc giữ nguyên**:
  - Endpoint `POST /data-provider-features/test` (`testStateless`) giữ nguyên 100% logic, request payload và behavior.
  - Method nội bộ `runner.testContextual(feature)` trong `DataProviderFeatureService.switchStatus` khi chuyển trạng thái sang `READY` vẫn hoạt động bình thường phục vụ self-check hệ thống.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế tại concept.md; không phát sinh Type Contract mới)*

- **Type Signatures & Code Contracts**:
  - Gỡ bỏ hoàn toàn class `TestFeatureContextualRequestDto` khỏi `data-provider-feature-request.dto.ts`.
- **AST Seams & Callers**:
  - [data-provider-feature.controller.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts):
    - Gỡ bỏ import `TestFeatureContextualRequestDto`.
    - Gỡ bỏ route handler `@PostRestApi({ path: ':id/test' }) testContextual`.
  - [data-provider-feature.service.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts):
    - Gỡ bỏ public method `testFeature(id: string, input?: any)`.
  - [data-provider-feature-request.dto.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts):
    - Gỡ bỏ export class `TestFeatureContextualRequestDto`.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
src/modules/data-provider/
├── controllers/
│   └── [MODIFY] data-provider-feature.controller.ts          # Xóa endpoint testContextual (@Post ':id/test')
├── dtos/requests/
│   └── [MODIFY] data-provider-feature-request.dto.ts         # Xóa class TestFeatureContextualRequestDto
└── services/
    └── [MODIFY] data-provider-feature.service.ts             # Xóa method testFeature(id, input)
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts` | `TestFeatureContextualRequestDto` | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-feature.service.ts` | `DataProviderFeatureService.testFeature` | `Order 1` | `npm run build` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider-feature.controller.ts` | `DataProviderFeatureController.testContextual` | `Order 2` | `npm run build` |

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts`
> **Action**: Xóa bỏ DTO `TestFeatureContextualRequestDto`.

```diff
@@ -43,7 +43,3 @@
     @ObjectFieldOptional({ description: 'Test input payload (e.g. url, htmlContentString, query)' })
     input?: Record<string, any>;
 }
-
-export class TestFeatureContextualRequestDto {
-    @ObjectFieldOptional({ description: 'Optional input payload override' })
-    input?: Record<string, any>;
-}
```

### 2. `[MODIFY]` `src/modules/data-provider/services/data-provider-feature.service.ts`
> **Action**: Xóa bỏ method `testFeature`.

```diff
@@ -182,14 +182,4 @@
         return await super.update(id, { status });
     }
 
-    async testFeature(id: string, input?: any): Promise<any> {
-        const feature = await this.dataProviderFeatureRepository.findOne({
-            where: { id },
-            relations: { dataProvider: true },
-        });
-
-        if (!feature) throw new AppException(DataProviderError.FeatureNotFound(id));
-
-        const runner = this.runnerRegistry.getRunner(feature.type);
-        return await runner.testContextual(feature, input);
-    }
-
     async getFeaturesByProviderId(dataProviderId: string): Promise<DataProviderFeatureDto[]> {
```

### 3. `[MODIFY]` `src/modules/data-provider/controllers/data-provider-feature.controller.ts`
> **Action**: Xóa bỏ import `TestFeatureContextualRequestDto` và endpoint `testContextual`.

```diff
@@ -7,7 +7,6 @@
 import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
 import {
     CreateDataProviderFeatureRequestDto,
-    TestFeatureContextualRequestDto,
     TestFeatureStatelessRequestDto,
     UpdateFeatureConfigRequestDto,
 } from '../dtos/requests/data-provider-feature-request.dto';
@@ -88,10 +87,4 @@
         return await this.featureService.createFeature(dataProviderId, request);
     }
 
-    @PostRestApi({
-        path: ':id/test',
-        summary: 'Test saved feature contextual',
-    })
-    async testContextual(@UUIDParam('id') id: string, @Body() request?: TestFeatureContextualRequestDto): Promise<any> {
-        return await this.featureService.testFeature(id, request?.input);
-    }
-
     @PostRestApi({
```

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - `[x]` `npm run build` (Biên dịch thành công với `tsc -p tsconfig.build.json && nest build` - Exit code 0).
- **Manual Checks**:
  - `[x]` Kiểm tra toàn bộ mã nguồn Backend: Không còn bất kỳ tham chiếu hay orphan import nào liên quan đến `TestFeatureContextualRequestDto` hoặc `testFeature`.
