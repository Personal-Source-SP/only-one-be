# Concept: Chuẩn hóa & Nâng cấp Hạ tầng WebSocket Realtime cho Only-One Backend

## 1. Problem Statement & Root Need (Bối cảnh & Vấn đề Cốt lõi)
- **Core Business Problem**: Hệ thống `only-one-be` xử lý các tác vụ ngầm kéo dài (Scraping dữ liệu, Discovery Validation, URL Ingestion, Data Sync, Simulation). Hiện tại, việc thiếu một hạ tầng WebSocket realtime đồng bộ và chuẩn hóa khiến client (frontend) phải sử dụng cơ chế Polling API định kỳ, gây lãng phí tài nguyên server, tăng tải Redis/Database và tạo độ trễ lớn (high latency) cho trải nghiệm người dùng.
- **Target Audience & Core Value**:
  - **End Users & Web Client**: Nhận phản hồi realtime về tiến độ xử lý tác vụ (progress percentage, status badges, error logs) và thông báo hệ thống tức thì.
  - **DevOps & Backend System**: Hỗ trợ mở rộng ngang đa node (horizontal scaling) thông qua Redis IO Adapter, quản lý phiên kết nối chặt chẽ và cô lập luồng dữ liệu an toàn theo từng room.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - Tái cấu trúc và chuẩn hóa `WebsocketModule` trong `src/modules/websocket` theo kiến trúc module sâu (deep module architecture).
  - **Redis IO Adapter**: Cấu hình Socket.IO Redis Adapter kết nối tới Redis instance để đồng bộ hóa events giữa nhiều backend node.
  - **Strict Handshake JWT Authentication**: Middleware/Guard kiểm tra token JWT nghiêm ngặt ngay tại thời điểm handshake (`socket.handshake.auth.token` hoặc `socket.handshake.headers.authorization`). Chặn toàn bộ client chưa xác thực.
  - **Lifecycle & Room Management**:
    - Tự động gắn client vào room định danh cá nhân `user_${userId}` khi kết nối thành công.
    - Cung cấp message handlers cho client join/leave các room nghiệp vụ chuyên biệt: `job_${jobId}`, `provider_${providerId}`.
  - **Domain Socket Services**:
    - `JobSocketService`: Phát tiến độ xử lý của các background worker (Scraping, Validation, Ingestion).
    - `NotificationSocketService`: Bắn thông báo realtime tới đích danh người dùng qua room cá nhân.
  - **WebSocket Exception Filters & Interceptors**: Bắt và chuẩn hóa lỗi socket events.
- **Explicit Out-of-Scope**:
  - Hỗ trợ kết nối Anonymous / Guest (Bắt buộc 100% connection phải có JWT hợp lệ).
  - Xây dựng component giao diện frontend (Frontend sẽ tích hợp theo contract sự kiện được định nghĩa).

---

## 3. Success Metrics (Thước đo Thành công / Definition of Done)
- **Strict Security Enforcement**: 100% kết nối thiếu JWT hoặc JWT không hợp lệ/hết hạn bị từ chối ngay tại giai đoạn handshake.
- **Sub-50ms Latency**: Thời gian truyền tin từ lúc service phát event tới khi client trong cùng room nhận được dưới 50ms trên hạ tầng tiêu chuẩn.
- **Zero Cross-Talk (Data Isolation)**: Sự kiện của `job_A` tuyệt đối không bị rò rỉ sang các client chỉ đăng ký theo dõi `job_B` hoặc user khác.
- **Multi-Instance Ready**: Khi có 2 node backend chạy song song, event phát từ Node 1 truyền tải chính xác tới client kết nối ở Node 2 qua Redis Adapter.

---

## 4. Proposed Solution & Core Mechanism (Phương pháp Giải quyết & Cơ chế Xử lý)

### 4.1. Explored Options & Trade-off Analysis (Các Phương án Đã Cân Nhắc)
| Option | Hướng tiếp cận | Ưu điểm (Pros) | Nhược điểm (Cons) | Độ phức tạp | Đánh giá |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option 1: Basic In-Memory Socket.IO Gateway** | Dùng default in-memory adapter của Socket.IO, broadcast trực tiếp từ Gateway. | Đơn giản, cài đặt nhanh, ít dependencies. | Không thể scale đa node (mỗi node bị cô lập bộ nhớ, mất event giữa các pod). | Low | Loại (Không đáp ứng yêu cầu kiến trúc dài hạn). |
| **Option 2: Redis Adapter + Room-Based Architecture (Chosen)** | Tích hợp `@socket.io/redis-adapter` kết hợp JWT Handshake Guard và chia tách Socket Services theo domain (Job, Notification). | Mở rộng ngang linh hoạt, bảo mật cao, tách bạch logic nghiệp vụ rõ ràng, cô lập room an toàn. | Cần cấu hình kết nối Redis Pub/Sub và lifecycle disconnect tin cậy. | Medium | **Lựa chọn (Đáp ứng hoàn hảo tiêu chuẩn production).** |
| **Option 3: External Message Broker (RabbitMQ / Kafka) SSE Stream** | Sử dụng Server-Sent Events (SSE) kết hợp Kafka/RabbitMQ để stream 1 chiều. | Nhẹ cho luồng 1 chiều, chuẩn HTTP/2. | Không hỗ trợ giao tiếp 2 chiều (client không thể emit action join/leave room linh hoạt). | High | Loại (Kém linh hoạt cho tương tác realtime 2 chiều). |

- **Chosen Strategy (Phương án Được Chọn)**: **Option 2** - Kiến trúc Socket.IO kết hợp Redis Adapter, JWT Handshake Guard nghiêm ngặt, và Room-based Domain Socket Services.

---

### 4.2. Core Processing Flow (Luồng Xử lý / Chuyển trạng thái Chính)
- **Workflow / Logic Flow**:
  1. **Handshake & Authentication**:
     - Client khởi tạo kết nối WebSocket kèm `auth: { token: "Bearer ..." }`.
     - Server giải mã JWT qua `JwtService`. Nếu thất bại $\rightarrow$ Ngắt kết nối ngay lập tức với mã lỗi `Unauthorized`.
     - Nếu thành công $\rightarrow$ Gán `user` payload vào `socket.data.user` và tự động cho socket tham gia room `user_${userId}`.
  2. **Room Subscription**:
     - Client gửi event `subscribe_job` kèm `{ jobId: "123" }`.
     - Gateway xử lý $\rightarrow$ Cho socket join vào room `job_123`.
     - Client gửi event `unsubscribe_job` $\rightarrow$ Socket rời khỏi room `job_123`.
  3. **Event Emission from Background Workers**:
     - Khi Worker (ví dụ: `ScrapingWorkerProcessor`) cập nhật tiến độ $\rightarrow$ Gọi `JobSocketService.emitProgress(jobId, payload)`.
     - Service gửi message tới room `job_${jobId}` qua Socket.IO server $\rightarrow$ Redis Pub/Sub đồng bộ tới toàn bộ các node $\rightarrow$ Client nhận được event `job_progress`.

- **Flow Diagram**:
  ```mermaid
  sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant GW as WebsocketGateway (NestJS)
    participant Auth as JWT Auth Guard
    participant Redis as Redis Adapter (Pub/Sub)
    participant Worker as Background Worker

    Note over Client,Auth: Connection & Handshake Phase
    Client->>GW: WS Connect (auth.token: Bearer JWT)
    GW->>Auth: Validate JWT Signature & Expiration
    alt Invalid Token
      Auth-->>Client: Reject Connection (401 Unauthorized)
    else Valid Token
      Auth->>GW: Attach user to socket.data
      GW->>GW: socket.join(`user_${userId}`)
      GW-->>Client: Connection Established (ACK)
    end

    Note over Client,Redis: Room Subscription Phase
    Client->>GW: Emit "subscribe_job" { jobId: "job_101" }
    GW->>GW: socket.join("job_101")
    GW-->>Client: Emit "subscribed" { room: "job_101" }

    Note over Worker,Client: Real-Time Event Dispatch
    Worker->>GW: JobSocketService.emitJobProgress("job_101", { progress: 75% })
    GW->>Redis: Broadcast to room "job_101"
    Redis-->>GW: Forward to subscribers across all nodes
    GW-->>Client: Emit "job_progress" { progress: 75% }
  ```

---

### 4.3. UI Wireframe / Visual Mockup (Mô phỏng Phản hồi Realtime trên Frontend)
```text
+-----------------------------------------------------------------------------+
| [Real-time Status: 🟢 Connected]   User: admin@only-one.com                 |
+-----------------------------------------------------------------------------+
| Active Job Monitor: [job_101]                                               |
| > Progress: [===============================>          ] 75%                |
| > Current URL: https://example.com/product/item-99                          |
| > Logs Stream:                                                              |
|   [19:22:01] Fetched category index (200 OK)                                |
|   [19:22:04] Extracted 48 product links                                     |
|   [19:22:08] Processing price heuristic scoring...                          |
+-----------------------------------------------------------------------------+
| Instant Alerts:                                                             |
| 🔔 [Notification] Worker completed ingestion for DataProvider #12           |
+-----------------------------------------------------------------------------+
```
- **State Handling Matrix**:
  - **Disconnected / Reconnecting State**: Client hiển thị indicator "🔴 Disconnected - Reconnecting...", tạm dừng gửi event join.
  - **Connected & Authenticated State**: Indicator "🟢 Connected", tự động tái đăng ký (re-subscribe) các active rooms.
  - **Auth Failed State**: Báo lỗi "Session Expired", kích hoạt refresh token flow hoặc redirect về login.

---

### 4.4. Critical Edge Cases & Risk Handling (Kịch bản Biên & Xử lý Rủi ro)
- **Token Expiration during Long-Lived Socket Connection**: Thiết lập cơ chế client gửi event refresh authentication hoặc kiểm tra định kỳ để ngắt kết nối khi token bị thu hồi.
- **Zombie Sockets / Sudden Disconnections**: Lắng nghe sự kiện `disconnecting` và `disconnect` để dọn dẹp các subscriptions và giải phóng tài nguyên.
- **Throttling / Storm Broadcasting**: Khi worker ghi log với tần suất cực cao (1000 logs/giây), áp dụng debounce / throttling trong socket service để tránh làm nghẽn event loop của Node.js và tràn băng thông client.

---

## 5. Technical English Key Patterns
### 1. Handshake-level authentication
- **Meaning (VI)**: Xác thực danh tính ngay tại bước bắt tay ban đầu của giao thức kết nối.
- **Grammar / Usage**: `[Subject] enforces handshake-level authentication to reject unauthorized connections before socket allocation`
- **Engineering Example**: *"Implementing **handshake-level authentication** guarantees that unauthenticated sockets are terminated before consuming server memory."*

### 2. Multi-node horizontal scaling
- **Meaning (VI)**: Mở rộng ngang trên nhiều máy chủ/container phân tán.
- **Grammar / Usage**: `[Technology] facilitates multi-node horizontal scaling via Pub/Sub adapters`
- **Engineering Example**: *"The Redis IO adapter facilitates seamless **multi-node horizontal scaling** by distributing room broadcasts across all backend replicas."*

### 3. Room-based event multiplexing
- **Meaning (VI)**: Kỹ thuật phân luồng và định tuyến sự kiện theo các phòng riêng biệt trên cùng một kết nối socket.
- **Grammar / Usage**: `[Subject] utilizes room-based event multiplexing to isolate tenant and job telemetry`
- **Engineering Example**: *"The architecture utilizes **room-based event multiplexing** so that clients only receive updates for their explicitly subscribed tasks."*
