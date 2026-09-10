# Debug: Config Version Config Column Violates Not-Null Constraint

---
status: fixed
slug: debug-config-version-null-violation
started_at: 2026-09-10 21:45:00
completed_at: 2026-09-10 21:48:00
reproduction_test: npx ts-node -P tsconfig.json -T scratch/repro.ts
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Stack Trace**: Khi gọi API `PUT /api/v1/data-provider-features/:id` (hoặc method `updateFeature`), ứng dụng trả về HTTP 500 với lỗi Database QueryFailedError:
  ```text
  QueryFailedError: null value in column "config" of relation "data_provider_config_versions" violates not-null constraint
      at PostgresQueryRunner.query (D:\Sources\PERSONAL\only-one-be\src\driver\postgres\PostgresQueryRunner.ts:325:19)
      at InsertQueryBuilder.execute (D:\Sources\PERSONAL\only-one-be\src\query-builder\InsertQueryBuilder.ts:164:33)
      at ConfigVersionService.create (D:\Sources\PERSONAL\only-one-be\src\modules\data-provider\services\config-version.service.ts:39:16)
      at DataProviderFeatureService.updateFeature (D:\Sources\PERSONAL\only-one-be\src\modules\data-provider\services\data-provider-feature.service.ts:80:13)
  ```
- **Red Test Case**: Script kiểm thử mapping AutoMapper giữa `CreateConfigVersionRequestDto` và `ConfigVersionEntity` khi không có `forMember(..., mapFrom(...))` cho trường `config`.
- **Lệnh chạy tái hiện**:
  ```bash
  npx ts-node -P tsconfig.json -T scratch/repro.ts
  ```
  Kết quả thực tế thu được (Red Loop):
  ```text
  --- TEST 1: WITHOUT forMember (Current Behavior) ---
  entity.config is: undefined
  ```

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  1. Trong `DataProviderFeatureService.updateFeature()`, khi cập nhật config thành công, method gọi `configVersionService.create({ featureId, isActive: true, config: validatedConfig, ... })`.
  2. Trong `ConfigVersionService.create()`, entity được chuyển đổi thông qua `this.mapper.map(request, CreateConfigVersionRequestDto, ConfigVersionEntity)`.
  3. Trong `DataProviderProfile` (`data-provider.profile.ts`), profile đăng ký `createMap(mapper, CreateConfigVersionRequestDto, ConfigVersionEntity)`.
  4. Do thuộc tính `config` có kiểu TypeScript là union/interface `TargetConfig` (không phải class có `@AutoMap()` schema), `@automapper/classes` suy luận design type là `Object` và bỏ qua/không tự động map trường này từ DTO sang Entity nếu không có `forMember((d) => d.config, mapFrom((s) => s.config))`.
  5. Kết quả là `entity.config` bị `undefined`. Khi TypeORM thực hiện `save(entity)`, cột `config` trong câu lệnh SQL `INSERT` mang giá trị `NULL`.
  6. Bảng PostgreSQL `data_provider_config_versions` có ràng buộc `NOT NULL` trên cột `config`, dẫn đến ngoại lệ `QueryFailedError: null value in column "config" of relation "data_provider_config_versions" violates not-null constraint`.

- **Bằng chứng & Dữ liệu thực nghiệm (Evidence)**:
  - Khởi tạo AutoMapper với cấu hình hiện tại trong `data-provider.profile.ts`:
    `mapper.map(request, CreateConfigVersionRequestDto, ConfigVersionEntity).config` trả về `undefined`.
  - Khi thêm `forMember((d) => d.config, mapFrom((s) => s.config))`:
    `mapper.map(request, CreateConfigVersionRequestDto, ConfigVersionEntity).config` trả về chính xác object `{ sampleUrl: 'https://example.com' }`.

- **Invariants bị vi phạm**:
  - Invariant: Mọi `ConfigVersionEntity` snapshot được tạo ra bắt buộc phải chứa snapshot cấu hình (`config`) hợp lệ tương ứng với phiên bản đang lưu.

- **Chiến lược khắc phục dự kiến (Proposed Fix Strategy)**:
  1. Trong [data-provider.profile.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.profile.ts), bổ sung cấu hình mapping rõ ràng `forMember((d) => d.config, mapFrom((s) => s.config))` cho cặp `CreateConfigVersionRequestDto` $\rightarrow$ `ConfigVersionEntity` (và `CreateDataProviderFeatureRequestDto` $\rightarrow$ `DataProviderFeatureEntity` để đảm bảo tính nhất quán).
  2. Bổ sung unit test regression guard trong `config-version.service.spec.ts` và `data-provider.profile.spec.ts` để kiểm tra mapping đầy đủ dữ liệu trường `config`.

---
*(🛑 Điểm dừng Review: Người dùng đã phê duyệt Section 1 & 2)*
---

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
src/modules/data-provider/
├── [MODIFY] data-provider.profile.ts                                # Thêm forMember mapFrom cho trường config
├── [NEW]    _tests/data-provider.profile.spec.ts                    # Unit test kiểm thử AutoMapper mapping
└── services/_tests/
    └── [MODIFY] config-version.service.spec.ts                     # Unit test method create lưu trữ config
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.profile.ts` | `DataProviderProfile.mapConfigVersion`, `DataProviderProfile.mapDataProviderFeature` | `None` | `npx ts-node -P tsconfig.json -T scratch/verify-profile.ts` |
| **2** | `[x]` | `[NEW]` | `src/modules/data-provider/_tests/data-provider.profile.spec.ts` | `describe('DataProviderProfile')` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/_tests/config-version.service.spec.ts` | `describe('create')` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)
### 1. `[MODIFY]` `src/modules/data-provider/data-provider.profile.ts`
> **Action**: Bổ sung `forMember((d) => d.config, mapFrom((s) => s.config))` khi map sang entity.
```diff
--- a/src/modules/data-provider/data-provider.profile.ts
+++ b/src/modules/data-provider/data-provider.profile.ts
@@ -74,7 +74,15 @@ export class DataProviderProfile extends AutomapperProfile {
                 mapFrom((s) => s.config),
             ),
         );
-        createMap(mapper, CreateDataProviderFeatureRequestDto, DataProviderFeatureEntity);
+        createMap(
+            mapper,
+            CreateDataProviderFeatureRequestDto,
+            DataProviderFeatureEntity,
+            forMember(
+                (d) => d.config,
+                mapFrom((s) => s.config),
+            ),
+        );
     }
 
     private mapDataProviderItem(mapper: Mapper): void {
@@ -120,7 +120,15 @@ export class DataProviderProfile extends AutomapperProfile {
                 mapFrom((s) => s.config),
             ),
         );
-        createMap(mapper, CreateConfigVersionRequestDto, ConfigVersionEntity);
+        createMap(
+            mapper,
+            CreateConfigVersionRequestDto,
+            ConfigVersionEntity,
+            forMember(
+                (d) => d.config,
+                mapFrom((s) => s.config),
+            ),
+        );
     }
```

### 2. `[NEW]` `src/modules/data-provider/_tests/data-provider.profile.spec.ts`
> **Action**: Thêm unit test kiểm thử AutoMapper bảo toàn cấu hình `config`.
```diff
--- /dev/null
+++ b/src/modules/data-provider/_tests/data-provider.profile.spec.ts
@@ -0,0 +1,46 @@
+import { classes } from '@automapper/classes';
+import { createMapper, Mapper } from '@automapper/core';
+
+import { DataProviderProfile } from '../data-provider.profile';
+import { CreateConfigVersionRequestDto } from '../dtos/requests/config-version-request.dto';
+import { CreateDataProviderFeatureRequestDto } from '../dtos/requests/data-provider-feature-request.dto';
+import { ConfigVersionEntity } from '../entities/config-version.entity';
+import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
+import { ConfigVersionType, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
+
+describe('DataProviderProfile', () => {
+    let mapper: Mapper;
+
+    beforeEach(() => {
+        mapper = createMapper({
+            strategyInitializer: classes(),
+        });
+        const profile = new DataProviderProfile(mapper);
+        profile.profile(mapper);
+    });
+
+    it('should correctly map config property from CreateConfigVersionRequestDto to ConfigVersionEntity', () => {
+        const dto = new CreateConfigVersionRequestDto({
+            featureId: 'deb65a15-2f1e-4077-8477-da39c55eac47',
+            isActive: true,
+            config: { sampleUrl: 'https://example.com/item' },
+            changeType: ConfigVersionType.MANUAL_EDIT,
+            changeDescription: 'Updated config',
+        });
+
+        const entity = mapper.map(dto, CreateConfigVersionRequestDto, ConfigVersionEntity);
+
+        expect(entity).toBeDefined();
+        expect(entity.featureId).toBe('deb65a15-2f1e-4077-8477-da39c55eac47');
+        expect(entity.config).toEqual({ sampleUrl: 'https://example.com/item' });
+        expect(entity.isActive).toBe(true);
+        expect(entity.changeType).toBe(ConfigVersionType.MANUAL_EDIT);
+    });
+});
```

### 3. `[MODIFY]` `src/modules/data-provider/services/_tests/config-version.service.spec.ts`
> **Action**: Thêm unit test kiểm tra `create` lưu entity chứa `config`.

## Section 5. Verification & Regression Guard
- **Automated Tests**:
  - `npx ts-node -P tsconfig.json -T scratch/verify-profile.ts`: `PASS (Green)`
  - `npx tsc -p tsconfig.build.json --noEmit`: `PASS`
- **Bài học kinh nghiệm (Lessons Learned)**:
  - Bổ sung quy tắc âm vào `only-one/rules.md`:
    `- **[AVOID]** Omitting explicit member mapping (forMember(..., mapFrom(...))) in AutoMapper profiles for polymorphic JSON or TypeScript interface fields (e.g., TargetConfig) — @automapper/classes reflects TypeScript interfaces as generic Object and ignores them during auto-mapping, which silently sets entity fields to undefined and violates database NOT NULL constraints.`
