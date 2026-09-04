---
id: 20260903-192300-sync-websocket-infrastructure
title: WebSocket Real-Time Infrastructure Upgrade
archived_at: 2026-09-03
status: active
references: []
affected_modules:
  - modules/websocket
---

# Archive: WebSocket Real-Time Infrastructure Upgrade

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: Hệ thống `only-one-be` thiếu cơ chế truyền thông điệp thời gian thực (real-time telemetry) cho các tác vụ nền kéo dài (Scraping, Ingestion, Simulation) và thông báo cá nhân cho người dùng, buộc client phải polling liên tục gây quá tải server.
- **Giá trị (Value)**: Chuẩn hóa module `WebsocketModule` đa tầng hỗ trợ Socket.io Redis Adapter (sẵn sàng cho multi-node deployment), xác thực JWT Handshake bắt buộc, tự động phân phối socket vào room cá nhân `user_${userId}`, quản lý đăng ký room theo job (`job_${jobId}`) và các Domain Socket Services (`JobSocketService`, `NotificationSocketService`) tự động lắng nghe sự kiện từ `EventEmitter2` để phát tới client.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Room Segmentation**:
  - `user_${userId}`: Tự động join khi handshake thành công.
  - `job_${jobId}`: Client chủ động subscribe qua message `subscribeJob` / `unsubscribeJob`.
- **Domain Socket Services**:
  - `JobSocketService`: Bắt `@OnEvent(WebSocketEvent.JOB_*)` và phát tới room `job_${jobId}`.
  - `NotificationSocketService`: Bắt `@OnEvent(WebSocketEvent.NOTIFICATION_CREATED)` và phát tới room `user_${userId}`.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [`src/modules/websocket/enums/subscribe-name.enum.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/websocket/enums/subscribe-name.enum.ts): Enums `SubscribeName` và `WebSocketEvent`.
- [`src/modules/websocket/interfaces/websocket.interface.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/websocket/interfaces/websocket.interface.ts): Data contracts `IJobProgressData`, `INotificationSocketData`.
- [`src/modules/websocket/gateways/websocket.gateway.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/websocket/gateways/websocket.gateway.ts): Gateway xử lý handshake, room management và helper dispatchers.
- [`src/modules/websocket/services/job.socket.service.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/websocket/services/job.socket.service.ts): Service chuyển tiếp tiến độ job.
- [`src/modules/websocket/services/notification.socket.service.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/websocket/services/notification.socket.service.ts): Service chuyển tiếp thông báo cá nhân.
- [`src/modules/websocket/websocket.module.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/websocket/websocket.module.ts): Export toàn bộ Gateway và Socket Services.
