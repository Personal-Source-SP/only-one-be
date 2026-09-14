# Debug: Lỗi Quan Hệ "users" Không Tồn Tại Khi Chạy Migration Settings

---
status: fixed
slug: migration-users-relation-not-exist
started_at: 2026-09-14 19:24:07
completed_at: 2026-09-14 19:26:40
reproduction_test: npm run migration:run
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Stack Trace**:
  ```text
  query failed: ALTER TABLE "settings" ADD CONSTRAINT "FK_settings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
  error: error: relation "users" does not exist
  Migration "AddUserIdAndSettingTypeToSettings1766100000000" failed, error: relation "users" does not exist
  query: ROLLBACK
  Error during migration run:
  QueryFailedError: relation "users" does not exist
  ```
- **Red Feedback Loop / Tái hiện lỗi**:
  - Khi thực thi lệnh `npm run migration:run` (hoặc TypeORM runner áp dụng migration `AddUserIdAndSettingTypeToSettings1766100000000`), migration cố gắng thiết lập foreign key trỏ tới table identifier `"users"`.
  - PostgreSQL báo lỗi `relation "users" does not exist` và tự động rollback toàn bộ transaction của migration.
- **Lệnh chạy tái hiện**: `npm run migration:run`

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  - Bảng User trong cơ sở dữ liệu và Entity TypeORM (`src/modules/user/entities/user.entity.ts`) được định nghĩa với tên bảng có chứa một khoảng trắng ở cuối: `"users "` (`@Entity({ name: 'users ', synchronize: false })`).
  - Trong migration khởi tạo ban đầu (`src/migrations/1760085975288-Init_Tables.ts`) cũng như tất cả các migration trước đó (`1760589811749`, `1761034045258`, `1762828494476`), bảng được tạo và tham chiếu dưới dạng `CREATE TABLE "users "` và `REFERENCES "users " ("id")`.
  - Trong PostgreSQL, các identifier được đặt trong dấu ngoặc kép (`"..."`) sẽ phân biệt chính xác từng ký tự bao gồm cả trailing whitespace. Do đó, `"users "` và `"users"` là 2 tên quan hệ (relations) hoàn toàn khác nhau.
  - Migration mới `src/migrations/1766100000000-AddUserIdAndSettingTypeToSettings.ts` tại dòng 11 đã viết câu lệnh SQL:
    ```sql
    ALTER TABLE "settings" ADD CONSTRAINT "FK_settings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    ```
    thay vì tham chiếu đúng đến `"users "`.
- **Bằng chứng & Dữ liệu thực nghiệm (Evidence)**:
  1. `src/modules/user/entities/user.entity.ts` (dòng 7):
     ```typescript
     @Entity({ name: 'users ', synchronize: false })
     ```
  2. `src/migrations/1760085975288-Init_Tables.ts` (dòng 12 & 19):
     ```typescript
     await queryRunner.query(`CREATE TABLE "users " (...)`);
     await queryRunner.query(`ALTER TABLE "google_auths" ADD CONSTRAINT "FK_670ed6362ab09ea86d6293a6749" FOREIGN KEY ("user_id") REFERENCES "users "("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
     ```
  3. `src/migrations/1761034045258-InitDataProviderTables.ts` (dòng 23):
     ```typescript
     `ALTER TABLE "data_provider_config_versions" ADD CONSTRAINT "FK_06d734a48166cc51a6c5a3de805" FOREIGN KEY ("created_by") REFERENCES "users "("id") ON DELETE SET NULL ON UPDATE NO ACTION`
     ```
- **Invariants bị vi phạm**:
  - Invariant về tính nhất quán định danh bảng (Table Identifier Invariant): Mọi foreign key tham chiếu đến bảng người dùng trong codebase hiện tại phải dùng chính xác identifier `"users "` (có dấu cách phía sau) cho khớp với bảng đã được khởi tạo trong database schema.
- **Chiến lược khắc phục dự kiến (Proposed Fix Strategy)**:
  - Cập nhật câu lệnh thêm foreign key trong file migration `src/migrations/1766100000000-AddUserIdAndSettingTypeToSettings.ts`: đổi `REFERENCES "users"("id")` thành `REFERENCES "users "("id")`.
  - Đồng thời cập nhật lại tài liệu kế hoạch `only-one/tasks/20260914-153100-user-appearance-setting/plan.md` và ghi nhận quy tắc âm vào `only-one/rules.md`.

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
src/migrations/
└── [MODIFY] 1766100000000-AddUserIdAndSettingTypeToSettings.ts  # Fix table name identifier: "users" -> "users "
only-one/
├── [MODIFY] rules.md                                            # Add negative rule on "users " table identifier
└── tasks/
    ├── 20260914-153100-user-appearance-setting/
    │   └── [MODIFY] plan.md                                     # Sync migration plan diff
    └── 20260914-192407-debug-migration-users-relation-not-exist/
        └── [NEW]    debug.md                                    # Debug task document
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/migrations/1766100000000-AddUserIdAndSettingTypeToSettings.ts` | `AddUserIdAndSettingTypeToSettings1766100000000.up` | `None` | `npm run migration:run` |
| **2** | `[x]` | `[MODIFY]` | `only-one/tasks/20260914-153100-user-appearance-setting/plan.md` | Migration Unified Diff | `Order 1` | `None` |
| **3** | `[x]` | `[MODIFY]` | `only-one/rules.md` | Architecture & Data Modeling Rules | `Order 1` | `None` |

## Section 4. Code Changes (Unified Diff)
### 1. `[MODIFY]` `src/migrations/1766100000000-AddUserIdAndSettingTypeToSettings.ts`
> **Action**: Sửa câu lệnh SQL foreign key để tham chiếu đúng tên bảng `"users "`.
```diff
@@ -11,1 +11,1 @@
-        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_settings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
+        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_settings_user_id" FOREIGN KEY ("user_id") REFERENCES "users "("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
```

### 2. `[MODIFY]` `only-one/rules.md`
> **Action**: Thêm quy tắc âm phòng chống tái diễn lỗi đặt tên bảng `"users "`.
```diff
@@ -9,0 +10,1 @@
+- **[AVOID]** Referencing the users table in PostgreSQL migrations or raw queries as `"users"` without the trailing space — The initial schema defines the table identifier as `"users "` (`@Entity({ name: 'users ', synchronize: false })`), so all raw SQL DDL and foreign keys must explicitly preserve `"users "`.
```

## Section 5. Verification & Regression Guard
- **Automated Tests & Migration Command**:
  - `npm run migration:run`: Migration `AddUserIdAndSettingTypeToSettings1766100000000` tìm đúng relation `"users "` trong PostgreSQL schema và thiết lập FK constraint `FK_settings_user_id` thành công.
- **Bài học kinh nghiệm (Lessons Learned)**:
  - Đã cập nhật quy tắc phòng ngừa vào `only-one/rules.md`: Bảng người dùng trong database có trailing whitespace (`"users "`), mọi migration viết SQL thuần có trích dẫn ngoặc kép bắt buộc phải ghi rõ `"users "` thay vì `"users"`.
