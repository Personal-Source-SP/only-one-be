---
id: 20260915-131744-setting-and-user-preferences-architecture
title: Kiến Trúc Cài Đặt Người Dùng & Đồng Bộ Tùy Chỉnh Cá Nhân (User Settings, Preferences & Tunnel Config)
archived_at: 2026-09-15
status: active
references:
  - only-one/archives/20260907-214608-common-exception-handling.md
affected_modules:
  - src/modules/setting
  - src/modules/user
---

# Archive: Kiến Trúc Cài Đặt Người Dùng & Đồng Bộ Tùy Chỉnh Cá Nhân (User Settings, Preferences & Tunnel Config)

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: 
  - Trước đây cấu hình người dùng (Theme Palette, Mode, Cloudflare Tunnel Token/URL) chỉ lưu cục bộ trên localStorage client, gây mất dữ liệu hoặc không đồng bộ khi chuyển thiết bị.
  - Quá trình khởi tạo và migration gặp lỗi schema liên quan tới foreign key `"users "` và xung đột trùng lặp khóa khi cập nhật cài đặt đã tồn tại.
- **Giá trị (Value)**: 
  - Cung cấp module `Setting` độc lập với mô hình lưu trữ linh hoạt (`SettingEntity` với `type`, `userId`, `key`, `value: jsonb`).
  - Hỗ trợ thao tác Upsert an toàn và idempotent, cung cấp các endpoint chuyên trách (`/settings/tunnel/config`, `/settings/user/:key`), đảm bảo đồng bộ cài đặt cá nhân xuyên suốt mọi phiên làm việc.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Mô hình Dữ liệu (Data Model)**:
  - Bảng `settings` với các trường `key`, `value: jsonb`, `userId`, `type: SettingType.USER`, `isActive: boolean`.
  - Migration liên kết foreign key an toàn với bảng `"users "`.
- **Cơ chế Xử lý Nghiệp vụ (Upsert & Query)**:
  - `SettingService.getUserSetting`: Truy vấn trực tiếp `this.findOneByFilter({ key, userId, type: SettingType.USER })`.
  - `SettingService.saveUserSetting`: Kiểm tra thực thể hiện có bằng `this.repository.findOne`. Nếu đã tồn tại, cập nhật `value` và lưu bằng `this.repository.save(existingEntity)`; nếu chưa, tạo mới và lưu nhằm đảm bảo tính toàn vẹn và tránh lỗi 409 KeyAlreadyExists.
- **Cấu hình Tunnel Endpoint (`TunnelConfig`)**:
  - Lưu trữ cấu hình tunnel (`mode: TunnelModeEnum`, `domain`, `remoteHost`, `remotePort`, `token`, `status`, `pid`) dưới key `CLOUDFLARE_TUNNEL_SETTING_KEY`.
  - Cung cấp endpoint `GET /settings/tunnel/config` lấy cấu hình trực tiếp từ user preferences.
- **Bảo mật & RESTful API**:
  - Controller `@Controller('settings')` được bảo vệ toàn diện bởi `@Auth()`.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [setting.entity.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/setting/entities/setting.entity.ts): Định nghĩa thực thể cài đặt đa năng.
- [setting.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/setting/services/setting.service.ts): Nghiệp vụ đọc/ghi cài đặt với logic Upsert chuẩn.
- [setting.controller.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/setting/controllers/setting.controller.ts): REST endpoints phục vụ người dùng và tunnel config.
- [tunnel-config-response.dto.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/setting/dtos/responses/tunnel-config-response.dto.ts): DTO phản hồi cấu hình tunnel.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Typecheck & Build**: `npm run build` $\rightarrow$ `PASS (0 errors)`.
- **Unit Tests**: `npm run test` $\rightarrow$ `PASS (100% test suites passed)`.
- **Trạng thái Codebase**: Đã đồng bộ 100% với mã nguồn hiện tại.
