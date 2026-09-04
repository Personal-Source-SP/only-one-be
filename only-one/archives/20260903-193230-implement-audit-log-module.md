---
id: 20260903-193230-implement-audit-log-module
title: Asynchronous Audit Log Module Implementation
archived_at: 2026-09-03
status: active
references: []
affected_modules:
  - modules/audit-log
  - modules/worker
  - modules/queue
---

# Archive: Asynchronous Audit Log Module Implementation

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: Hệ thống thiếu cơ chế lưu vết kiểm toán (Audit Trail) tập trung khi quản trị viên thực hiện các thao tác thay đổi dữ liệu nhạy cảm (cấu hình nguồn cào, sửa thông tin người dùng, điều chỉnh feature toggles). Việc ghi log đồng bộ vào DB sẽ làm tăng latency của API và dễ gây nghẽn I/O.
- **Giá trị (Value)**: Xây dựng module `AuditLogModule` hoàn chỉnh với cơ chế ghi log bất đồng bộ qua `EventEmitter2` kết hợp Bull Queue (`QUEUE_NAME.AUDIT_LOG_JOB = 'audit-log-job'`) và worker `AuditLogWorkerProcessor` trong `WorkerModule`. Tự động làm sạch dữ liệu nhạy cảm (sanitization cho password, secret, token, apiKey), hỗ trợ REST API phân trang `GET /api/v1/audit-logs` và `GET /api/v1/audit-logs/:id` bảo vệ bởi `JwtAuthGuard`.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Event-Driven & Queue Decoupling**:
  - Domain services gọi `AuditLogService.record(payload)` $\rightarrow$ emit `audit.log.record`.
  - `AuditLogListener` bắt event và đẩy job vào Bull queue `AUDIT_LOG_JOB` với retry exponential backoff.
  - `AuditLogWorkerProcessor` (trong `src/modules/worker/processors/`) tiêu thụ job và lưu vào PostgreSQL bảng `audit_logs`.
- **Sensitive Field Redaction**:
  - `AuditLogService.saveAuditLog()` đệ quy quét và thay thế các trường nhạy cảm bằng `***REDACTED***`.
- **BaseController Compliance**:
  - `AuditLogController extends BaseController<AuditLogEntity, AuditLogDto>` với cấu hình phân trang `AUDIT_LOG_PAGINATION_CONFIG` qua `nestjs-paginate`.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [`src/modules/audit-log/enums/audit-log.enum.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/enums/audit-log.enum.ts): `AuditAction`, `AuditStatus`, `AuditResource`.
- [`src/modules/audit-log/entities/audit-log.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/entities/audit-log.entity.ts): Thực thể `AuditLogEntity` với các trường JSONB.
- [`src/modules/audit-log/dtos/audit-log.dto.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/dtos/audit-log.dto.ts) & [`record-audit-log.dto.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/dtos/requests/record-audit-log.dto.ts): DTOs.
- [`src/modules/audit-log/profiles/audit-log.profile.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/profiles/audit-log.profile.ts): AutoMapper profile.
- [`src/modules/audit-log/services/audit-log.service.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/services/audit-log.service.ts): Service quản lý nghiệp vụ và sanitization.
- [`src/modules/audit-log/listeners/audit-log.listener.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/listeners/audit-log.listener.ts): Listener đẩy job vào Bull Queue.
- [`src/modules/worker/processors/audit-log-worker.processor.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/worker/processors/audit-log-worker.processor.ts): Worker xử lý lưu log.
- [`src/modules/audit-log/controllers/audit-log.controller.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/controllers/audit-log.controller.ts): REST API Controller.
- [`src/modules/audit-log/audit-log.module.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/audit-log/audit-log.module.ts) & [`src/modules/worker/worker.module.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/worker/worker.module.ts): Đăng ký module và processor.
