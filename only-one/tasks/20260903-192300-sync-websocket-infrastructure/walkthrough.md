# Walkthrough: Chuẩn hóa & Nâng cấp Hạ tầng WebSocket Realtime cho Only-One Backend

Tài liệu này tổng kết toàn bộ các thay đổi mã nguồn và kết quả xác thực kiểm thử cho việc chuẩn hóa và nâng cấp hạ tầng WebSocket trong `only-one-be`.

---

## 1. Tóm tắt Thay đổi (Summary of Changes)

Đã nâng cấp và hoàn thiện module **WebSocket** với kiến trúc đa tầng (Multi-layered Architecture) hỗ trợ Socket.io Redis Adapter, JWT Handshake Authentication, và Domain Socket Services:

1. **Chuẩn hóa Enums (`subscribe-name.enum.ts`)**:
   - Mở rộng [SubscribeName](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/enums/subscribe-name.enum.ts#L22-L29) với các sự kiện: `JOB_STARTED`, `JOB_PROGRESS`, `JOB_COMPLETED`, `JOB_FAILED`, `NEW_NOTIFICATION`.
   - Mở rộng [WebSocketEvent](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/enums/subscribe-name.enum.ts#L30-L53) với các action: `SUBSCRIBE_JOB`, `UNSUBSCRIBE_JOB`, `SUBSCRIBE_PROVIDER`, `UNSUBSCRIBE_PROVIDER` và các background job events `job.*`.
2. **Khai báo Interfaces (`websocket.interface.ts`)**:
   - Bổ sung [IJobProgressData](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/interfaces/websocket.interface.ts#L48-L56) cho dữ liệu tiến độ công việc ngầm.
   - Bổ sung [INotificationSocketData](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/interfaces/websocket.interface.ts#L58-L66) cho dữ liệu thông báo tức thì tới người dùng.
3. **Nâng cấp Gateway (`websocket.gateway.ts`)**:
   - Tự động join room cá nhân `user_${userId}` trong [handleConnection](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/gateways/websocket.gateway.ts#L51-L58) khi xác thực JWT thành công.
   - Thêm message handlers cho `subscribeJob` và `unsubscribeJob`.
   - Thêm helper methods: [sendNotificationToUser](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/gateways/websocket.gateway.ts#L228-L240) và [sendJobProgress](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/gateways/websocket.gateway.ts#L241-L248).
4. **Domain Socket Services (`job.socket.service.ts` & `notification.socket.service.ts`)**:
   - Tạo [JobSocketService](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/services/job.socket.service.ts) tự động bắt các sự kiện `@OnEvent(WebSocketEvent.JOB_*)` từ các background worker và phát realtime tới room `job_${jobId}`.
   - Tạo [NotificationSocketService](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/services/notification.socket.service.ts) tự động bắt `@OnEvent(WebSocketEvent.NOTIFICATION_CREATED)` và phát realtime tới room `user_${userId}`.
5. **Module Export (`websocket.module.ts`)**:
   - Cập nhật [WebsocketModule](file:///d:/Sources/Personal/only-one-be/src/modules/websocket/websocket.module.ts) cung cấp và export toàn bộ Gateway, Domain Socket Services, và Listener.

---

## 2. Kết quả Xác thực Kiểm thử (Verification Evidence)

### 2.1. Kiểm tra Linter
```bash
npm run lint
```
- **Kết quả**: **PASS** (Không phát hiện lỗi lint hoặc vi phạm coding standards).

### 2.2. Kiểm tra TypeScript Compilation & Nest Build
```bash
npm run build
```
- **Kết quả**: **PASS** (Biên dịch TypeScript và đóng gói NestJS thành công sang thư mục `dist/`).

---

## 3. Hướng dẫn Tích hợp & Phát Sự kiện Realtime

### 3.1. Từ Background Workers (Scraping, Ingestion, Validation):
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocketEvent } from '../websocket/enums/subscribe-name.enum';

// Bắn tiến độ xử lý job
this.eventEmitter.emit(WebSocketEvent.JOB_PROGRESS, {
    jobId: job.id,
    jobName: job.name,
    progress: 75,
    status: 'active',
    data: { currentUrl: 'https://example.com' },
    timestamp: Date.now(),
});
```

### 3.2. Từ Notification Service:
```typescript
// Bắn thông báo đích danh tới người dùng
this.eventEmitter.emit(WebSocketEvent.NOTIFICATION_CREATED, {
    id: notification.id,
    userId: notification.userId,
    title: 'Xử lý hoàn tất',
    content: 'Tác vụ cào dữ liệu đã hoàn thành.',
    createdAt: new Date(),
});
```

### 3.3. Từ Frontend Client (Socket.io Client):
```javascript
// 1. Kết nối có JWT
const socket = io('http://localhost:3000', {
    auth: { token: 'Bearer <JWT_TOKEN>' },
    transports: ['websocket'],
});

// 2. Tự động nhận thông báo cá nhân
socket.on('newNotification', (response) => {
    console.log('Notification:', response.data);
});

// 3. Đăng ký theo dõi tiến độ một job cụ thể
socket.emit('subscribeJob', { jobId: 'job_101' });

socket.on('jobProgress', (response) => {
    console.log(`Job Progress: ${response.data.progress}%`);
});
```
