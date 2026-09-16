---
id: 20260916-094735-toggle-file-logging
title: Cơ chế Bật / Tắt Ghi File Logs (Toggle File Logging)
archived_at: 2026-09-16
status: active
references:
  - only-one/archives/20260907-214608-common-exception-handling.md
affected_modules:
  - shared
---

# Archive: Cơ chế Bật / Tắt Ghi File Logs (Toggle File Logging)

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: `LoggerService` luôn tự động khởi tạo 2 instance của `DailyRotateFile` (cho level `debug` và `warn`) ghi file log ra đĩa (`./logs/${nodeEnv}/${contextName}`). Điều này gây tiêu tốn dung lượng I/O và tạo file rác không cần thiết trong các môi trường ephemeral/containerized hoặc khi developer chỉ cần quan sát qua standard output (Console).
- **Giá trị (Value)**: Cung cấp cờ cấu hình môi trường `LOG_FILE_ENABLE` linh hoạt để chủ động bật/tắt ghi file logs trong khi vẫn đảm bảo `Console` transport hoạt động liên tục.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Hướng tiếp cận (Approach)**:
  - Bổ sung biến môi trường `LOG_FILE_ENABLE` trong `.env.sample` và `.env`.
  - Thêm getter `isFileLoggingEnabled: boolean` trong `AppConfigService`.
  - Trong `LoggerService.getWinstonConfig`, khởi tạo mặc định mảng `transports` với `Console` transport và chỉ conditionally push thêm 2 instance `DailyRotateFile` khi `process.env.LOG_FILE_ENABLE === 'true'`.
- **Sơ đồ cấu hình Transport (Diagram)**:
  ```mermaid
  flowchart TD
      A[LoggerService.getWinstonConfig] --> B[Default Console Transport]
      A --> C{LOG_FILE_ENABLE === 'true'?}
      C -- Yes --> D[Push DailyRotateFile debug & warn]
      C -- No --> E[Console Only]
  ```

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [.env.sample](file:///Users/kiem/Sources/PERSONAL/only-one-be/.env.sample): Khai báo `LOG_FILE_ENABLE`.
- [app-config.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/shared/services/app-config.service.ts): Bổ sung `get isFileLoggingEnabled(): boolean`.
- [logger.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/shared/services/logger.service.ts): Đăng ký `DailyRotateFile` theo điều kiện cờ cấu hình.
- [logger.service.spec.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/shared/services/_tests/logger.service.spec.ts): Unit test kiểm tra số lượng và kiểu transport khi bật/tắt cờ.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Trạng thái Test**: 100% Passed (`src/shared/services/_tests/logger.service.spec.ts` 2/2 tests pass; build TypeScript exit 0).
- **PR URL / Branch**: `main`
