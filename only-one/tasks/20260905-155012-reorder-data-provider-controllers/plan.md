---
status: done
slug: 20260905-155012-reorder-data-provider-controllers
started_at: 2026-09-05
completed_at: 2026-09-05
pr_url: ~
branch: ~
---

# Plan: Chuẩn hóa thứ tự Handler trong DataProvider Controllers (GET -> POST -> PUT -> DELETE)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- Trong thư mục `src/modules/data-provider/controllers/`, 4/8 controller (`data-provider-feature.controller.ts`, `discovery-session.controller.ts`, `discovery-url.controller.ts`, `discovery-validation.controller.ts`) có thứ tự các HTTP verbs bị phân tán (GET xen kẽ POST, PUT đứng trước GET, hoặc POST nằm sau PUT).
- 4 controller còn lại (`data-provider.controller.ts`, `data-provider-item.controller.ts`, `item.controller.ts`, `scraping-data.controller.ts`) đã tuân thủ chuẩn thứ tự và được audit xác nhận.
- **Invariants**:
  - Không thay đổi bất kỳ method signature, decorator metadata (`@ApiOperation`, `@BaseApiOkResponse`, `@Version`, `@HttpCode`, `@UUIDParam`, `@Body`, `@Param`, `@User`), DTO typing hoặc business logic nào.
  - Bảo toàn trật tự route specificity: static / sub-resource routes (e.g. `:id/versions`, `:id/summary`) luôn đứng trước dynamic single param route (`:id`) để tránh route shadowing trong router engine.

## Section 2. Detailed Design (Thiết kế Kỹ thuật Chi tiết)
- Áp dụng cấu trúc phân vùng chuẩn hóa theo thứ tự HTTP Method Groups cho toàn bộ controllers:
  1. **GET Handlers Group**: Truy xuất dữ liệu (Collection -> Sub-resources -> Single Item).
  2. **POST Handlers Group**: Tạo mới, xử lý stateless testing, batch actions, rollbacks.
  3. **PUT / PATCH Handlers Group**: Cập nhật trạng thái (State transitions) và cấu hình entity.
  4. **DELETE Handlers Group**: Xóa sub-resource hoặc thực thể.

### Sơ đồ luồng phân tầng Controller
```text
Controller Class
  ├── Constructor & Dependencies
  ├── [GET] Handlers Group
  │     ├── Collection Queries (data-providers/:dataProviderId)
  │     ├── Sub-resource Queries (:id/versions, :id/summary, :id/validation-logs)
  │     └── Single Entity Queries (:id)
  ├── [POST] Handlers Group
  │     ├── Sandbox / Stateless Actions (test, bulk-actions)
  │     ├── Create Resources (data-providers/:dataProviderId, root POST)
  │     └── Contextual Actions & Rollbacks (:id/test, :id/versions/:versionId/rollback)
  ├── [PUT] Handlers Group
  │     ├── Sub-resource & Status Transitions (:id/switch-status/:status)
  │     └── Update Config (:id)
  └── [DELETE] Handlers Group
        └── Sub-resource Deletions (:id/versions/:versionId)
```

## Section 3. Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Reused Existing Utilities / Helpers | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider-feature.controller.ts` | `DataProviderFeatureController` | `@UUIDParam`, `@BaseApiOkResponse`, `@Auth` | `None` | `npm run test:e2e -- --testPathPattern=data-provider-feature` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-session.controller.ts` | `DiscoverySessionController` | `@UUIDParam`, `@BaseApiOkResponse`, `@Auth` | `None` | `npm run test:e2e -- --testPathPattern=discovery-session` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-url.controller.ts` | `DiscoveryUrlController` | `@UUIDParam`, `@BaseApiOkResponse`, `@Auth` | `None` | `npm run test:e2e -- --testPathPattern=discovery-url` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-validation.controller.ts` | `DiscoveryValidationController` | `@UUIDParam`, `@BaseApiOkResponse`, `@Auth` | `None` | `npm run test:e2e -- --testPathPattern=discovery-validation` |

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/controllers/data-provider-feature.controller.ts`
> **Action**: Sắp xếp các endpoints thành các block rõ ràng: GET (`findByProvider`, `findByProviderAndType`, `getVersions`, `findById`) -> POST (`testStateless`, `createFeature`, `testContextual`, `rollbackVersion`) -> PUT (`switchStatus`, `updateConfig`) -> DELETE (`deleteVersion`).

```diff
--- a/src/modules/data-provider/controllers/data-provider-feature.controller.ts
+++ b/src/modules/data-provider/controllers/data-provider-feature.controller.ts
@@ -47,6 +47,13 @@ export class DataProviderFeatureController {
         return await this.featureService.getFeatureByProviderIdAndType(dataProviderId, type);
     }
 
+    @ApiOperation({ summary: 'Get version history for feature' })
+    @Version('1')
+    @Get(':id/versions')
+    @BaseApiOkResponse(ConfigVersionDto)
+    public async getVersions(@UUIDParam('id') id: string): Promise<ConfigVersionDto[]> {
+        return await this.configVersionService.getConfigVersionOptionsByFeature(id);
+    }
+
     @ApiOperation({ summary: 'Get feature by ID' })
     @Version('1')
     @Get(':id')
@@ -83,6 +90,17 @@ export class DataProviderFeatureController {
         return await this.featureService.testFeature(id, request?.input);
     }
 
+    @ApiOperation({ summary: 'Rollback feature version' })
+    @Version('1')
+    @Post(':id/versions/:versionId/rollback')
+    @BaseApiOkResponse(Boolean)
+    public async rollbackVersion(
+        @UUIDParam('id') id: string,
+        @Param('versionId', ParseIntPipe) versionId: number,
+        @User() user: PayloadDto,
+    ): Promise<boolean> {
+        return await this.configVersionService.rollbackToVersionIdByFeature(id, versionId, user);
+    }
+
     @ApiOperation({ summary: 'Update feature configuration' })
     @Version('1')
     @Put(':id')
@@ -103,24 +121,6 @@ export class DataProviderFeatureController {
         return await this.featureService.switchStatus(id, status);
     }
 
-    @ApiOperation({ summary: 'Get version history for feature' })
-    @Version('1')
-    @Get(':id/versions')
-    @BaseApiOkResponse(ConfigVersionDto)
-    public async getVersions(@UUIDParam('id') id: string): Promise<ConfigVersionDto[]> {
-        return await this.configVersionService.getConfigVersionOptionsByFeature(id);
-    }
-
-    @ApiOperation({ summary: 'Rollback feature version' })
-    @Version('1')
-    @Post(':id/versions/:versionId/rollback')
-    @BaseApiOkResponse(Boolean)
-    public async rollbackVersion(
-        @UUIDParam('id') id: string,
-        @Param('versionId', ParseIntPipe) versionId: number,
-        @User() user: PayloadDto,
-    ): Promise<boolean> {
-        return await this.configVersionService.rollbackToVersionIdByFeature(id, versionId, user);
-    }
-
     @ApiOperation({ summary: 'Delete inactive feature version' })
     @Version('1')
     @Delete(':id/versions/:versionId')
```

### 2. `[MODIFY]` `src/modules/data-provider/controllers/discovery-session.controller.ts`
> **Action**: Đưa endpoint `getSummary` (`GET :id/summary`) lên trước `create` (`POST /`).

```diff
--- a/src/modules/data-provider/controllers/discovery-session.controller.ts
+++ b/src/modules/data-provider/controllers/discovery-session.controller.ts
@@ -27,6 +27,14 @@ export class DiscoverySessionController extends BaseController<DiscoverySession
         });
     }
 
+    @ApiOperation({ summary: 'Get session summary metrics' })
+    @HttpCode(HttpStatus.OK)
+    @Version('1')
+    @Get(':id/summary')
+    @BaseApiOkResponse(DiscoverySessionSummaryResponseDto)
+    public async getSummary(@UUIDParam('id') id: string): Promise<DiscoverySessionSummaryResponseDto> {
+        return await this.sessionService.getSessionSummary(id);
+    }
+
     @ApiOperation({ summary: 'Create a new discovery session' })
     @HttpCode(HttpStatus.OK)
     @Version('1')
@@ -35,13 +43,5 @@ export class DiscoverySessionController extends BaseController<DiscoverySession
     public async create(@Body() request: CreateDiscoverySessionRequestDto, @User() user: PayloadDto): Promise<DiscoverySessionDto> {
         return await this.sessionService.createSession(request, user);
     }
-
-    @ApiOperation({ summary: 'Get session summary metrics' })
-    @HttpCode(HttpStatus.OK)
-    @Version('1')
-    @Get(':id/summary')
-    @BaseApiOkResponse(DiscoverySessionSummaryResponseDto)
-    public async getSummary(@UUIDParam('id') id: string): Promise<DiscoverySessionSummaryResponseDto> {
-        return await this.sessionService.getSessionSummary(id);
-    }
 }
```

### 3. `[MODIFY]` `src/modules/data-provider/controllers/discovery-url.controller.ts`
> **Action**: Đưa endpoint `getValidationLogs` (`GET :id/validation-logs`) lên trước `batchIngestUrls` (`POST sessions/:sessionId/batch-ingest`).

```diff
--- a/src/modules/data-provider/controllers/discovery-url.controller.ts
+++ b/src/modules/data-provider/controllers/discovery-url.controller.ts
@@ -27,6 +27,14 @@ export class DiscoveryUrlController extends BaseController<DiscoveryUrlEntity,
         });
     }
 
+    @ApiOperation({ summary: 'Get validation audit logs for a discovered URL' })
+    @HttpCode(HttpStatus.OK)
+    @Version('1')
+    @Get(':id/validation-logs')
+    @BaseApiOkResponse(DiscoveryValidationLogDto, { isArray: true })
+    public async getValidationLogs(@UUIDParam('id') id: string): Promise<DiscoveryValidationLogDto[]> {
+        return await this.discoveryUrlService.getValidationLogsByUrl(id);
+    }
+
     @ApiOperation({ summary: 'Batch ingest approved URLs for a discovery session into Item and DataProviderItem catalog' })
     @HttpCode(HttpStatus.OK)
     @Version('1')
@@ -38,13 +46,5 @@ export class DiscoveryUrlController extends BaseController<DiscoveryUrlEntity,
     ): Promise<IngestDiscoveryUrlResponseDto> {
         return await this.discoveryUrlService.batchIngest(sessionId, request?.urlIds);
     }
-
-    @ApiOperation({ summary: 'Get validation audit logs for a discovered URL' })
-    @HttpCode(HttpStatus.OK)
-    @Version('1')
-    @Get(':id/validation-logs')
-    @BaseApiOkResponse(DiscoveryValidationLogDto, { isArray: true })
-    public async getValidationLogs(@UUIDParam('id') id: string): Promise<DiscoveryValidationLogDto[]> {
-        return await this.discoveryUrlService.getValidationLogsByUrl(id);
-    }
 }
```

### 4. `[MODIFY]` `src/modules/data-provider/controllers/discovery-validation.controller.ts`
> **Action**: Đưa endpoint `getLatestBatch` (`GET sessions/:sessionId/latest-batch`) lên đầu class trước tất cả các POST endpoints.

```diff
--- a/src/modules/data-provider/controllers/discovery-validation.controller.ts
+++ b/src/modules/data-provider/controllers/discovery-validation.controller.ts
@@ -20,6 +20,14 @@ export class DiscoveryValidationController {
     constructor(private readonly validationService: DiscoveryValidationService) {}
 
+    @ApiOperation({ summary: 'Get latest validation batch progress for a session' })
+    @HttpCode(HttpStatus.OK)
+    @Version('1')
+    @Get('sessions/:sessionId/latest-batch')
+    @BaseApiOkResponse(DiscoveryValidationBatchDto)
+    public async getLatestBatch(@UUIDParam('sessionId') sessionId: string): Promise<DiscoveryValidationBatchDto> {
+        return await this.validationService.getLatestValidationBatch(sessionId);
+    }
+
     @ApiOperation({ summary: 'Trigger batch validation on discovery session URLs' })
     @HttpCode(HttpStatus.OK)
     @Version('1')
@@ -32,14 +40,6 @@ export class DiscoveryValidationController {
         return await this.validationService.startBatchValidation(sessionId, request?.targetKeyword);
     }
 
-    @ApiOperation({ summary: 'Get latest validation batch progress for a session' })
-    @HttpCode(HttpStatus.OK)
-    @Version('1')
-    @Get('sessions/:sessionId/latest-batch')
-    @BaseApiOkResponse(DiscoveryValidationBatchDto)
-    public async getLatestBatch(@UUIDParam('sessionId') sessionId: string): Promise<DiscoveryValidationBatchDto> {
-        return await this.validationService.getLatestValidationBatch(sessionId);
-    }
-
     @ApiOperation({ summary: 'Submit bulk user actions for discovered URLs' })
     @HttpCode(HttpStatus.OK)
     @Version('1')
```

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `npm run lint` — Kiểm tra toàn bộ linting rules và formatting.
  - `npm run build` — Biên dịch TypeScript đảm bảo không có bất kỳ lỗi cú pháp hoặc import/export nào.
- **Manual Checks**:
  - Khởi chạy server và kiểm tra Swagger docs tại `/api/docs` để xác nhận thứ tự các route handler hiển thị đúng theo nhóm `GET -> POST -> PUT -> DELETE`.
