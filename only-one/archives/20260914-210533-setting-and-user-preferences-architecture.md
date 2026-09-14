---
id: 20260914-210533-setting-and-user-preferences-architecture
title: Kiến Trúc Cài Đặt Người Dùng & Đồng Bộ Tùy Chỉnh Cá Nhân (User Settings & Preferences)
archived_at: 2026-09-14
status: active
references:
  - only-one/archives/20260907-214608-common-exception-handling.md
affected_modules:
  - setting
  - user
---

# Archive: Kiến Trúc Cài Đặt Người Dùng & Đồng Bộ Tùy Chỉnh Cá Nhân (User Settings & Preferences)

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: 
  - Trước đây cấu hình người dùng (Theme Palette, Mode) chỉ lưu cục bộ trên localStorage client, gây mất dữ liệu khi đổi thiết bị.
  - Quá trình khởi tạo và migration gặp lỗi schema liên quan tới foreign key `users ` và xung đột trùng lặp khóa khi cập nhật cài đặt đã tồn tại.
- **Giá trị (Value)**: 
  - Cung cấp module `Setting` độc lập với mô hình lưu trữ linh hoạt (`SettingEntity` với `type`, `userId`, `key`, `value: jsonb`).
  - Hỗ trợ thao tác Upsert an toàn và idempotent, đảm bảo đồng bộ cài đặt cá nhân xuyên suốt mọi phiên làm việc của người dùng.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Mô hình Dữ liệu (Data Model)**:
  - Bảng `settings` với các trường `key`, `value: jsonb`, `userId`, `type: SettingType.USER`, `isActive: boolean`.
  - Migration liên kết foreign key an toàn với bảng `"users "`.
- **Cơ chế Xử lý Nghiệp vụ (Upsert & Query)**:
  - `SettingService.getUserSetting`: Truy vấn trực tiếp `this.findOneByFilter({ key, userId, type: SettingType.USER })`.
  - `SettingService.saveUserSetting`: Kiểm tra thực thể hiện có bằng `this.repository.findOne`. Nếu đã tồn tại, gán giá trị mới và lưu bằng `this.repository.save(existingEntity)`; nếu chưa, tạo mới và lưu bằng `this.repository.save(newEntity)` nhằm đảm bảo tính toàn vẹn và tránh lỗi 409 KeyAlreadyExists.
- **Bảo mật & RESTful API**:
  - Endpoint `@Controller('settings')` được bảo vệ toàn diện bởi `@Auth()`.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [setting.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/setting/entities/setting.entity.ts): Định nghĩa thực thể cài đặt đa năng.
- [setting.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/setting/services/setting.service.ts): Nghiệp vụ đọc/ghi cài đặt với logic Upsert chuẩn.
- [setting.controller.ts](file:///d:/Sources/Personal/only-one-be/src/modules/setting/controllers/setting.controller.ts): REST endpoints phục vụ người dùng.
- [rules.md](file:///d:/Sources/Personal/only-one-be/only-one/rules.md): Bổ sung quy tắc âm về việc tham chiếu bảng `"users "` trong migration.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Typecheck & Build**: `npx tsc --project tsconfig.build.json --noEmit` $\rightarrow$ `PASS (0 errors)`.
- **Trạng thái Codebase**: Đã đồng bộ 100% với mã nguồn hiện tại.
