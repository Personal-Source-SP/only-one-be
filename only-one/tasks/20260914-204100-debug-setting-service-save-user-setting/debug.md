# Debug: SettingService.saveUserSetting Ném Lỗi KeyAlreadyExists Khi Cập Nhật Setting Đã Tồn Tại

---
status: fixed
slug: debug-setting-service-save-user-setting
started_at: 2026-09-14 20:41:00
completed_at: 2026-09-14 20:44:00
reproduction_test: npx tsc --project tsconfig.build.json --noEmit
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Stack Trace**:
  Khi người dùng cố gắng cập nhật cấu hình cá nhân đã tồn tại trong DB thông qua `SettingService.saveUserSetting(userId, key, value)`, hệ thống throw ra exception:
  ```json
  {
    "response": {
      "code": "setting_key_already_exists",
      "message": "Khóa cấu hình đã tồn tại trong hệ thống."
    },
    "status": 409,
    "name": "AppException",
    "appError": {
      "code": "setting_key_already_exists",
      "message": "Khóa cấu hình đã tồn tại trong hệ thống.",
      "statusCode": 409
    }
  }
  ```
- **Red Test Case**: Gọi `saveUserSetting` với setting key đã tồn tại trong database gây ném lỗi 409 `KeyAlreadyExists`.
- **Lệnh kiểm tra build & type safety**: `npx tsc --project tsconfig.build.json --noEmit`

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  1. Trong hàm `saveUserSetting(userId, key, value)` tại `src/modules/setting/services/setting.service.ts:L74-L79`:
     ```typescript
     if (entity) {
         entity.value = value;
         const updated = await this.create(entity);
         return this.mapper.map(updated, SettingEntity, SettingDto);
     }
     ```
  2. Khi `entity` đã tồn tại trong DB, hàm lại gọi `this.create(entity)`.
  3. Phương thức `this.create` (override từ `BaseService`) thực hiện kiểm tra `await this.exists({ key: request.key })`. Vì bản ghi đã tồn tại nên `exists === true`, dẫn đến ném lỗi `AppException(SettingError.KeyAlreadyExists)` với HTTP 409 Conflict.
  4. Ngoài ra, việc sử dụng `this.findOneByFilter` trả về `SettingDto` thay vì entity TypeORM gốc, và việc gọi `super.create` kèm map 2 lần cũng gây sai lệch kiểu dữ liệu (Double Mapping).
- **Invariants bị vi phạm**:
  - `saveUserSetting` là một thao tác **Upsert / Idempotent**: Nếu đã tồn tại thì phải UPDATE bản ghi hiện có (`repository.save`), nếu chưa tồn tại thì mới CREATE bản ghi mới.
  - Tuyệt đối không được gọi `this.create` (vốn chứa validation `exists`) khi đang thực hiện logic update bản ghi đã tồn tại.
- **Chiến lược khắc phục (Fix Strategy)**:
  1. Sử dụng trực tiếp `this.repository.findOne({ where: { key, userId, type: SettingType.USER } })` để truy vấn entity TypeORM gốc.
  2. Nếu tìm thấy `existingEntity`: gán `existingEntity.value = value` và lưu lại bằng `await this.repository.save(existingEntity)`, sau đó map sang `SettingDto`.
  3. Nếu chưa tồn tại: tạo mới bằng `this.repository.create(...)`, lưu lại bằng `await this.repository.save(newEntity)`, sau đó map sang `SettingDto`.
  4. Chuẩn hóa `getUserSetting` trả về `this.findOneByFilter(...)` tránh duplicate mapping.

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
src/modules/setting/services/
└── [MODIFY] setting.service.ts  # Sửa logic saveUserSetting và getUserSetting
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/setting/services/setting.service.ts` | `SettingService.saveUserSetting`, `SettingService.getUserSetting` | `None` | `npx tsc --project tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)
### 1. `[MODIFY]` `src/modules/setting/services/setting.service.ts`
```diff
@@ -53,40 +53,38 @@
     async getUserSetting(userId: string, key: string): Promise<SettingDto | null> {
-        const entity = await this.findOneByFilter({
+        const setting = await this.findOneByFilter({
             key,
             userId,
             type: SettingType.USER,
         });
 
-        if (!entity) {
-            return null;
-        }
-
-        return this.mapper.map(entity, SettingEntity, SettingDto);
+        return setting ?? null;
     }
 
     async saveUserSetting(userId: string, key: string, value: Record<string, any>): Promise<SettingDto> {
-        let entity = await this.findOneByFilter({
-            key,
-            userId,
-            type: SettingType.USER,
-        });
-
-        if (entity) {
-            entity.value = value;
-
-            const updated = await this.create(entity);
-            return this.mapper.map(updated, SettingEntity, SettingDto);
-        }
+        const existingEntity = await this.repository.findOne({
+            where: {
+                key,
+                userId,
+                type: SettingType.USER,
+            },
+        });
+
+        if (existingEntity) {
+            existingEntity.value = value;
+
+            const updated = await this.repository.save(existingEntity);
+            return this.mapper.map(updated, SettingEntity, SettingDto);
+        }
 
         const newEntity = this.repository.create({
             key,
             value,
             userId,
             isActive: true,
             type: SettingType.USER,
         });
 
-        const saved = await super.create(newEntity);
+        const saved = await this.repository.save(newEntity);
         return this.mapper.map(saved, SettingEntity, SettingDto);
     }
```

## Section 5. Verification & Regression Guard
- **Typecheck & Compilation**:
  - `npx tsc --project tsconfig.build.json --noEmit`: `PASS (Green, 0 errors)`
- **Bài học kinh nghiệm (Lessons Learned)**:
  - Khi override phương thức `create` của BaseService với nghiệp vụ `exists() check`, không bao giờ được tái sử dụng `this.create` cho các nhánh Update/Upsert của entity đã tồn tại.
  - Sử dụng trực tiếp `this.repository.save(entity)` cho thao tác Upsert an toàn.
