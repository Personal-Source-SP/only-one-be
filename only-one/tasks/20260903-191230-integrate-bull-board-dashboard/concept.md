# Concept: Tích hợp Bull Board Dashboard Quản lý Background Jobs cho Only-One Backend

## 1. Problem Statement & Root Need (Bối cảnh & Vấn đề Cốt lõi)
- **Core Business Problem**: Hệ thống `only-one-be` sử dụng message queue (Bull/BullMQ) để xử lý các background jobs (như crawler, ingestion worker, data sync, notification...). Hiện tại, việc theo dõi trạng thái hàng đợi (active, completed, failed, delayed, waiting), gỡ lỗi (debug) job thất bại, hoặc thử lại (retry)/xóa (clean) job thủ công phụ thuộc vào log hoặc truy vấn trực tiếp Redis. Điều này gây tốn thời gian và rủi ro thao tác sai khi vận hành.
- **Target Audience & Core Value**: 
  - **Developers & DevOps/System Admins**: Có giao diện trực quan (UI Dashboard) để giám sát realtime tình trạng queue, kiểm tra error stacktrace của job hỏng, retry failed jobs một click mà không cần can thiệp database/Redis.
  - **System Stability**: Phát hiện sớm hiện tượng bottleneck, nghẽn hàng đợi (queue lag/backpressure), hoặc job thất bại hàng loạt.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - Module `BullBoardModule` trong `src/modules/bull-board` tương thích chuẩn kiến trúc NestJS của dự án `only-one-be`.
  - Tự động quét và phát hiện các Queue instances được đăng ký trong NestJS ApplicationContext (`DiscoveryService` / `ModulesContainer`) và tự động gắn vào Bull Board Adapter.
  - Middleware xác thực HTTP Basic Auth (`createBasicAuthMiddleware`) độc lập, cấu hình thông qua biến môi trường (`BULL_BOARD_USERNAME`, `BULL_BOARD_PASSWORD`).
  - Cấu hình linh hoạt qua file `.env`: Cờ bật/tắt (`ENABLE_BULL_BOARD=true/false`) và tùy biến đường dẫn truy cập (`BULL_BOARD_PATH`, mặc định `/admin/queues` hoặc `/bull-board`).
  - Tích hợp Express Adapter (`@bull-board/express` & `@bull-board/api`).
- **Explicit Out-of-Scope**:
  - Tự xây dựng giao diện frontend tùy biến (Sử dụng trực tiếp UI đóng gói sẵn của `@bull-board/express`).
  - Phân quyền chi tiết nhiều tầng (RBAC per user/role) bên trong Bull Board (dùng single credential Basic Auth để giữ tính gọn nhẹ và cách ly hoàn toàn với auth flow người dùng).
  - Can thiệp hoặc thay đổi business logic của các Producers/Processors/Consumers hiện có.

---

## 3. Success Metrics (Thước đo Thành công / Definition of Done)
- **Zero Configuration Boilerplate**: Khi tạo mới một Queue bất kỳ trong hệ thống, queue đó tự động xuất hiện trên Bull Board mà không cần khai báo thủ công thêm vào BullBoardModule.
- **Zero Overhead when Disabled**: Khi `ENABLE_BULL_BOARD=false`, route và middleware hoàn toàn không được mount, không tiêu tốn tài nguyên server.
- **Security Compliance**: Truy cập route Bull Board mà không có hoặc sai header `Authorization: Basic ...` bị chặn với HTTP status `401 Unauthorized`.
- **Response Time & Stability**: Tải trang Dashboard dưới 500ms đối với Redis local/remote tiêu chuẩn.

---

## 4. Proposed Solution & Core Mechanism (Phương pháp Giải quyết & Cơ chế Xử lý)

### 4.1. Explored Options & Trade-off Analysis (Các Phương án Đã Cân Nhắc)
| Option | Hướng tiếp cận | Ưu điểm (Pros) | Nhược điểm (Cons) | Độ phức tạp | Đánh giá |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option 1: Explicit Static Registration** | Khai báo thủ công danh sách từng Queue trong `BullModule.registerQueue(...)` khi import `BullBoardModule`. | Trực quan, dễ kiểm soát danh sách queue hiển thị nếu muốn ẩn bớt queue nội bộ. | Dễ quên khai báo khi phát triển queue mới; code coupling giữa các module. | Low | Loại (Không đáp ứng yêu cầu tự động). |
| **Option 2: Dynamic Auto-Discovery with Basic Auth (Chosen)** | Sử dụng NestJS `DiscoveryService` / `Explorer` để tự động scan tất cả Bull Queue instances lúc bootstrap và gắn HTTP Basic Auth Middleware. | Tự động 100%, decoupled hoàn toàn với các feature modules khác, cấu hình bật/tắt linh hoạt qua `.env`. | Cần xử lý lifecycle hook `onApplicationBootstrap` sau khi tất cả queue đã sẵn sàng. | Medium | **Lựa chọn (Tối ưu trải nghiệm dev & vận hành).** |
| **Option 3: JWT / Admin Portal RBAC Guard Integration** | Tích hợp Bull Board router vào hệ thống Admin Guard và kiểm tra JWT token của User admin. | Dùng chung tài khoản Admin, bảo mật theo session/token của app. | Phức tạp, dễ vướng cookie/header cross-origin khi Bull Board UI gửi internal static assets / AJAX requests. | High | Loại (Dễ gây bug static assets và cồng kềnh không cần thiết). |

- **Chosen Strategy (Phương án Được Chọn)**: **Option 2** - Dynamic Auto-Discovery kết hợp HTTP Basic Auth Middleware độc lập và cấu hình tùy biến qua `ConfigService`.

---

### 4.2. Core Processing Flow (Luồng Xử lý / Chuyển trạng thái Chính)
- **Workflow / Logic Flow**:
  1. **Bootstrap Phase**:
     - NestJS khởi động `BullBoardModule`.
     - Kiểm tra flag `ENABLE_BULL_BOARD`. Nếu `false` $\rightarrow$ Skip mounting.
     - Nếu `true` $\rightarrow$ Khởi tạo `ExpressAdapter` với route `BULL_BOARD_PATH` (mặc định `/admin/queues`).
     - Áp dụng `createBasicAuthMiddleware` lên route này.
     - Sau khi App Bootstrap (`onApplicationBootstrap`), tự động scan toàn bộ Bull Queue instances và bọc vào `BullAdapter`/`BullMQAdapter`, sau đó gọi `createBullBoard({ queues, serverAdapter })`.
  2. **Client Request Phase**:
     - Client truy cập `GET /admin/queues`.
     - Middleware bắt request $\rightarrow$ Kiểm tra Basic Auth header (`username`/`password`).
     - Nếu không hợp lệ $\rightarrow$ Trả `401 Unauthorized` kèm header `WWW-Authenticate: Basic realm="Bull Board"`.
     - Nếu hợp lệ $\rightarrow$ Render Bull Board UI Dashboard.
  3. **Job Management Actions**:
     - User thực hiện Retry / Clean / Promote job trên UI $\rightarrow$ Bull Board API gửi command trực tiếp tới Redis $\rightarrow$ Cập nhật trạng thái job tức thì.

- **Flow Diagram**:
  ```mermaid
  sequenceDiagram
    autonumber
    actor Admin as DevOps / Developer
    participant Client as Browser UI
    participant Middleware as BasicAuthMiddleware
    participant Adapter as ExpressAdapter (BullBoard)
    participant Nest as NestJS Discovery
    participant Redis as Redis / Bull Queues

    Note over Nest,Adapter: App Bootstrap Phase
    Nest->>Nest: Scan all Bull Queue instances
    Nest->>Adapter: Register queues to createBullBoard
    Adapter->>Adapter: Set base path (e.g. /admin/queues)

    Note over Admin,Redis: Request Handling Phase
    Admin->>Client: Open /admin/queues
    Client->>Middleware: HTTP GET /admin/queues
    alt Missing / Invalid Credentials
      Middleware-->>Client: 401 Unauthorized (WWW-Authenticate)
      Client-->>Admin: Show Login Prompt
    else Valid Credentials
      Middleware->>Adapter: Forward request (next())
      Adapter->>Redis: Fetch Queue States & Job Metrics
      Redis-->>Adapter: Return jobs (active, failed, completed...)
      Adapter-->>Client: Render Bull Board Web Dashboard
      Client-->>Admin: Display Interactive Monitoring Dashboard
    end
  ```

---

### 4.3. UI Wireframe / Visual Mockup (Mẫu Phác thảo Giao diện Bull Board)
```text
+-----------------------------------------------------------------------------------+
| [Bull Board Logo]  Only-One Queues Dashboard           [Auto-Refresh: 5s v] [Dark]|
+-----------------------------------------------------------------------------------+
| QUEUES LIST (Discovered)      | QUEUE DETAILS: [ingestion-worker-queue]           |
|-------------------------------|---------------------------------------------------|
| > ingestion-worker-queue (15) | [All (15)] [Active (2)] [Waiting (3)] [Failed (1)]|
| > notification-queue     (0)  |---------------------------------------------------|
| > data-sync-queue        (5)  | Actions: [Retry All Failed] [Clean Completed]     |
|                               |---------------------------------------------------|
|                               | Job #1042 - URL Ingestion In-Progress [Active]    |
|                               | > Processed: 45% | Elapsed: 2.3s                  |
|                               |---------------------------------------------------|
|                               | Job #1039 - Sync Job Error [Failed]               |
|                               | > Error: Connection Timeout to Target Host        |
|                               | > Stacktrace: at Socket.connect (/app/dist/...)   |
|                               | > Actions: [ 🔄 Retry Job ] [ 🗑️ Remove Job ]     |
+-----------------------------------------------------------------------------------+
```
- **State Handling Matrix**:
  - **Empty State**: Khi một queue chưa có job nào, hiển thị empty banner "No jobs in this queue state".
  - **Loading State**: Hiển thị loading bar / skeleton khi fetching state từ Redis.
  - **Error / Validation State**: Khi sai Basic Auth, trình duyệt popup form nhập Username/Password hoặc hiển thị thông báo `401 Access Denied`.

---

### 4.4. Critical Edge Cases & Risk Handling (Kịch bản Biên & Xử lý Rủi ro)
- **Timing Attacks on Basic Auth**: Sử dụng so sánh chuỗi an toàn (`crypto.timingSafeEqual`) hoặc thư viện chuẩn để ngăn chặn timing attacks khi so sánh username/password.
- **Queues Loaded Asynchronously / Late Providers**: Sử dụng `onApplicationBootstrap` lifecycle hook thay vì `onModuleInit` để đảm bảo 100% các Dynamic Modules và Worker Queues đã được inject hoàn tất vào NestJS container trước khi quét.
- **Missing Environment Variables**: Nếu `ENABLE_BULL_BOARD=true` nhưng chưa cấu hình `BULL_BOARD_USERNAME` hoặc `BULL_BOARD_PASSWORD`, module sẽ log cảnh báo (`Logger.warn`) hoặc throw error lúc bootstrap ở môi trường production để tránh mở dashboard không bảo vệ.
- **High Redis Memory / Large Payloads**: Hạn chế serialize các payload dữ liệu quá lớn hiển thị trên job preview nhằm tránh nghẽn băng thông socket khi dashboard auto-refresh.

---

## 5. Technical English Key Patterns
### 1. Auto-discovery mechanism
- **Meaning (VI)**: Cơ chế tự động phát hiện/quét các thành phần trong hệ thống mà không cần khai báo tường minh.
- **Grammar / Usage**: `[Compound Noun] subject + enables / facilitates + [Action]`
- **Engineering Example**: *"The **auto-discovery mechanism** dynamically scans the application context and binds all initialized Bull queues to the dashboard adapter."*

### 2. Feature toggling / Flag-driven activation
- **Meaning (VI)**: Bật/tắt tính năng dựa trên cờ cấu hình môi trường mà không cần sửa code.
- **Grammar / Usage**: `[Noun Phrase] + allows safe rollout and zero footprint in production environments`
- **Engineering Example**: *"Using **feature toggling** via environment variables ensures zero memory and routing footprint when the monitoring dashboard is disabled."*

### 3. Decoupled architecture
- **Meaning (VI)**: Kiến trúc tách rời (giảm thiểu sự phụ thuộc trực tiếp giữa các module).
- **Grammar / Usage**: `A is decoupled from B to minimize blast radius and boilerplate`
- **Engineering Example**: *"The monitoring module is completely **decoupled** from feature modules, allowing queues to be added or removed without touching the dashboard code."*
