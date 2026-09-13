---
id: 20260903-191230-integrate-bull-board-dashboard
title: Bull Board Dashboard Integration for Queue Telemetry
archived_at: 2026-09-03
status: active
references: []
affected_modules:
  - modules/bull-board
  - modules/queue
  - shared
---

# Archive: Bull Board Dashboard Integration for Queue Telemetry

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: Hệ thống sử dụng nhiều hàng đợi Bull (`scraping-job`, `discovery-validation-job`, `discovery-ingestion-job`, `audit-log-job`) để xử lý các tác vụ nền, nhưng thiếu giao diện trực quan để giám sát trạng thái job (active, waiting, completed, failed, delayed), thống kê số lượng xử lý, và thực hiện retry các job lỗi.
- **Giá trị (Value)**: Tích hợp module `BullBoardAppModule` tự động quét và gắn kết toàn bộ các queue trong enum `QUEUE_NAME`, hỗ trợ bảo vệ bằng HTTP Basic Auth gọn nhẹ qua biến môi trường (`BULL_BOARD_USERNAME`, `BULL_BOARD_PASSWORD`), có cờ bật/tắt `ENABLE_BULL_BOARD` và tùy chỉnh đường dẫn `BULL_BOARD_PATH` (mặc định `/admin/queues`).

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Dynamic Module (`BullBoardAppModule.register()`)**:
  - Tự động map tất cả queue names trong `QUEUE_NAME` enum sang `BullAdapter`.
  - Sử dụng `@bull-board/nestjs` và `@bull-board/express`.
- **Basic Auth Security Middleware (`createBasicAuthMiddleware`)**:
  - Sử dụng `express-basic-auth` bảo vệ endpoint dashboard độc lập với JWT guard của API.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [`src/modules/bull-board/bull-board.module.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/bull-board/bull-board.module.ts): Dynamic module khởi tạo dashboard.
- [`src/modules/bull-board/create-basic-auth-middleware.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/bull-board/create-basic-auth-middleware.ts): Middleware xác thực Basic Auth.
- [`src/shared/services/app-config.service.ts`](file:///d:/Sources/Personal/only-one-be/src/shared/services/app-config.service.ts): Getter `bullBoardConfig`.
- [`src/app.module.ts`](file:///d:/Sources/Personal/only-one-be/src/app.module.ts): Đăng ký `BullBoardAppModule.register()`.
