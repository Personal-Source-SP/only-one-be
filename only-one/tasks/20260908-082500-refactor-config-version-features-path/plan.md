---
status: done
slug: 20260908-082500-refactor-config-version-features-path
started_at: 2026-09-08
completed_at: 2026-09-08
pr_url: ~
branch: ~
---

# Plan: Tái Cấu Trúc URI Path Cho Config Version Features

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- `ConfigVersionController` hiện dùng base route `@Controller('data-provider-features')`, trùng lặp với `DataProviderFeatureController` và làm nhòe ranh giới tài nguyên giữa quản lý tính năng và lịch sử phiên bản.
- Frontend (`only-one-fe`) đang ghép nối trực tiếp route cũ trong `API_ENDPOINT.DATA_PROVIDER_FEATURES.VERSIONS` và `ROLLBACK`, phụ thuộc vào cấu trúc URL cũ `/data-provider-features/:id/versions...`.
- **Invariants bắt buộc duy trì**:
  - Giữ nguyên logic quản lý phiên bản snapshot và transactional atomic rollback trong `config-version.service.ts`.
  - Giữ nguyên kiểu dữ liệu route parameters (`id` là UUID string, `versionId` là integer `ParseIntPipe`).

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)
*(Kế thừa 100% cơ chế vận hành từ concept.md; không phát sinh Type Contract mới)*

- **Backend Route Decorators & AST Seams**:
  - `ConfigVersionController` (`config-version.controller.ts`):
    - Base decorator: `@Controller('config-version-features')`, `@ApiTags('Config Version Features')`.
    - `getVersions`: `@GetRestApi({ path: ':id', summary: 'Get version history for feature', responseDto: ConfigVersionDto, isArray: true })`.
    - `rollbackVersion`: `@PostRestApi({ path: ':id/rollback/:versionId', summary: 'Rollback feature version', responseDto: Boolean })`.
    - `deleteVersion`: `@DeleteRestApi({ path: ':id/:versionId', summary: 'Delete inactive feature version', responseDto: Boolean })`.
- **Frontend Endpoint Contracts & Callers**:
  - `API_ENDPOINT.CONFIG_VERSION_FEATURES` (`endpoint.ts`):
    - `BASE`: `prefix('config-version-features')`
    - `VERSIONS`: `(featureId: string | number) => prefix('config-version-features/${featureId}')`
    - `ROLLBACK`: `(featureId: string | number, versionId: string | number) => prefix('config-version-features/${featureId}/rollback/${versionId}')`
    - `DELETE`: `(featureId: string | number, versionId: string | number) => prefix('config-version-features/${featureId}/${versionId}')`
  - Callers:
    - `useFeatureVersionManager.ts`: Cập nhật gọi `API_ENDPOINT.CONFIG_VERSION_FEATURES.VERSIONS` và `API_ENDPOINT.CONFIG_VERSION_FEATURES.ROLLBACK`.
    - `useFeatureHistoryManager.ts`: Cập nhật gọi `API_ENDPOINT.CONFIG_VERSION_FEATURES.VERSIONS` và `API_ENDPOINT.CONFIG_VERSION_FEATURES.ROLLBACK`.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
only-one-be/src/modules/data-provider/
└── controllers/
    └── [MODIFY] config-version.controller.ts     # Đổi base route sang 'config-version-features' & tinh gọn sub-routes

only-one-fe/src/
├── config/
│   └── [MODIFY] endpoint.ts                     # Thêm nhóm CONFIG_VERSION_FEATURES
└── app/(root)/scraping/features/[dataProviderId]/hooks/
    ├── [MODIFY] useFeatureVersionManager.ts     # Chuyển sang dùng CONFIG_VERSION_FEATURES
    └── [MODIFY] useFeatureHistoryManager.ts     # Chuyển sang dùng CONFIG_VERSION_FEATURES
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/controllers/config-version.controller.ts` | `ConfigVersionController` route decorators | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `only-one-fe/src/config/endpoint.ts` | `API_ENDPOINT.CONFIG_VERSION_FEATURES` | `None` | `npx tsc --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/hooks/useFeatureVersionManager.ts` | `useFeatureVersionManager` | `Order 2` | `npx tsc --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/hooks/useFeatureHistoryManager.ts` | `useFeatureHistoryManager` | `Order 2` | `npx tsc --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `only-one-be/src/modules/data-provider/controllers/config-version.controller.ts`
> **Action**: Đổi base path sang `config-version-features` và chuẩn hóa các sub-route methods.

```diff
@@ -9,12 +9,12 @@
-@Controller('data-provider-features')
-@ApiTags('Config Versions')
+@Controller('config-version-features')
+@ApiTags('Config Version Features')
 @Auth()
 export class ConfigVersionController {
     constructor(private readonly configVersionService: ConfigVersionService) {}
 
     @GetRestApi({
-        path: ':id/versions',
+        path: ':id',
         summary: 'Get version history for feature',
         responseDto: ConfigVersionDto,
         isArray: true,
@@ -25,7 +25,7 @@
     }
 
     @PostRestApi({
-        path: ':id/versions/:versionId/rollback',
+        path: ':id/rollback/:versionId',
         summary: 'Rollback feature version',
         responseDto: Boolean,
     })
@@ -38,7 +38,7 @@
     }
 
     @DeleteRestApi({
-        path: ':id/versions/:versionId',
+        path: ':id/:versionId',
         summary: 'Delete inactive feature version',
         responseDto: Boolean,
     })
```

---

### 2. `[MODIFY]` `only-one-fe/src/config/endpoint.ts`
> **Action**: Thêm cấu hình nhóm endpoint `CONFIG_VERSION_FEATURES` và dọn dẹp các endpoint version trong `DATA_PROVIDER_FEATURES`.

```diff
@@ -24,8 +24,13 @@
         TEST: prefix('data-provider-features/test'),
-        VERSIONS: (id: string | number) => prefix(`data-provider-features/${id}/versions`),
-        ROLLBACK: (id: string | number, versionId: string | number) =>
-            prefix(`data-provider-features/${id}/versions/${versionId}/rollback`),
+    },
+    CONFIG_VERSION_FEATURES: {
+        BASE: prefix('config-version-features'),
+        VERSIONS: (featureId: string | number) => prefix(`config-version-features/${featureId}`),
+        ROLLBACK: (featureId: string | number, versionId: string | number) =>
+            prefix(`config-version-features/${featureId}/rollback/${versionId}`),
+        DELETE: (featureId: string | number, versionId: string | number) =>
+            prefix(`config-version-features/${featureId}/${versionId}`),
     },
     DATA_PROVIDER_ITEMS: {
```

---

### 3. `[MODIFY]` `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/hooks/useFeatureVersionManager.ts`
> **Action**: Cập nhật hook gọi `API_ENDPOINT.CONFIG_VERSION_FEATURES`.

```diff
@@ -28,3 +28,3 @@
     const { result: versionsResult, query: versionsQuery } = useCustomData({
-        url: API_ENDPOINT.DATA_PROVIDER_FEATURES.VERSIONS(feature.id),
+        url: API_ENDPOINT.CONFIG_VERSION_FEATURES.VERSIONS(feature.id),
         enabled: Boolean(open && feature.id),
@@ -83,3 +83,3 @@
             await handleCustomMutationData({
-                url: API_ENDPOINT.DATA_PROVIDER_FEATURES.ROLLBACK(feature.id, vId),
+                url: API_ENDPOINT.CONFIG_VERSION_FEATURES.ROLLBACK(feature.id, vId),
                 method: 'post',
```

---

### 4. `[MODIFY]` `only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/hooks/useFeatureHistoryManager.ts`
> **Action**: Cập nhật hook lịch sử gọi `API_ENDPOINT.CONFIG_VERSION_FEATURES`.

```diff
@@ -29,3 +29,3 @@
     const { result: versionsResult, query: versionsQuery } = useCustomData({
-        url: API_ENDPOINT.DATA_PROVIDER_FEATURES.VERSIONS(featureId),
+        url: API_ENDPOINT.CONFIG_VERSION_FEATURES.VERSIONS(featureId),
         enabled: Boolean(featureId),
@@ -54,3 +54,3 @@
             await handleCustomMutationData({
-                url: API_ENDPOINT.DATA_PROVIDER_FEATURES.ROLLBACK(featureId, versionId),
+                url: API_ENDPOINT.CONFIG_VERSION_FEATURES.ROLLBACK(featureId, versionId),
                 method: 'post',
```

---

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - [x] Backend build & compile: `npm run build` (trong `only-one-be`) — **PASS (Code 0)**
  - [x] Frontend type-check: `npx tsc --noEmit` (trong `only-one-fe`) — **PASS (Code 0)**
- **Manual Checks**:
  - [x] Backend route registration `@Controller('config-version-features')` và endpoints `:id`, `:id/rollback/:versionId`, `:id/:versionId` đã được kiểm tra tính hợp lệ.
  - [x] Frontend `API_ENDPOINT.CONFIG_VERSION_FEATURES` và các hooks `useFeatureVersionManager`, `useFeatureHistoryManager` đã được đồng bộ chuẩn xác.
