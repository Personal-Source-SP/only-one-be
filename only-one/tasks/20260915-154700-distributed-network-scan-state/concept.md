# Concept: Phân tán Trạng thái Quét Thiết bị Mạng với Redis (Distributed Network Scan State)

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Trong môi trường triển khai thực tế đa node (multi-instance sau Load Balancer / PM2 cluster / Kubernetes pods).
- **Hiện tượng & Khiếm khuyết kỹ thuật**: Trạng thái tiến trình quét mạng (`scanStatus`, `discoveredCount`, `startedAt`, `completedAt`) hiện đang được lưu trong bộ nhớ RAM cục bộ (in-memory instance properties) của class `DeviceAggregatorService`.
- **Nguyên nhân cốt lõi (Root Cause)**:
  1. *State Discrepancy (Không đồng bộ trạng thái giữa các Node)*: Request kích hoạt quét (`POST /network-devices/scan/trigger`) đến Node 1, nhưng request lấy trạng thái (`GET /network-devices/scan/status`) tiếp theo lại rơi vào Node 2 $\rightarrow$ Node 2 trả về `IDLE` và `devicesDiscoveredCount = 0`.
  2. *Duplicate Scan Race Condition (Xung đột quét trùng lặp)*: Nếu 2 request trigger đến 2 node khác nhau cùng lúc, cả 2 node đều kiểm tra `this.scanStatus === IDLE` cục bộ và đồng thời khởi chạy tiến trình quét mạng, gây bão lưu lượng (packet storm) trên mạng LAN.
  3. *Unrecoverable Crash State (Mất trạng thái khi crash)*: Nếu node đang quét bị restart/crash giữa chừng, trạng thái quét bị mất hoàn toàn và không có cơ chế timeout/expiration tự phục hồi.
- **Tác động (Impact / Blast Radius)**: Sai lệch trạng thái hiển thị trên giao diện người dùng (UI); quá tải lưu lượng mạng LAN do nhiều node cùng quét; vi phạm nguyên tắc Stateless Microservice.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**: Chuyển toàn bộ state quản trị tiến trình quét mạng và cơ chế khóa chống quét trùng lặp sang **Redis tập trung (Distributed Shared State & Mutex Lock)**.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - *Distributed Mutex Lock*: Sử dụng Redis Lock (`SETNX` với TTL 5 phút) để đảm bảo tại một thời điểm chỉ có duy nhất 1 node được phép thực thi tiến trình quét mạng trên toàn cụm.
  - *Shared State Storage*: Trạng thái scan (`status`, `devicesDiscoveredCount`, `startedAt`, `completedAt`) được lưu trữ trên Redis với key chuẩn hóa (`network_device:scan_state`) kèm TTL tự động. Mọi node khi gọi `GET /network-devices/scan/status` đều đọc chung một state từ Redis.
  - *Real-time Incremental Counter*: Cập nhật số lượng thiết bị phát hiện (`devicesDiscoveredCount`) dạng nguyên tử (atomic increment/update) trên Redis để client polling hoặc subscribe nhận dữ liệu chính xác theo thời gian thực.
  - *Stateless Node*: `DeviceAggregatorService` hoàn toàn stateless, an toàn tuyệt đối khi scale $N$ nodes.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - Tích hợp Redis client (`ioredis` hoặc shared redis provider từ `AppConfigService`) vào module `network-device`.
  - Cập nhật `DeviceAggregatorService` đọc/ghi trạng thái quét và quản lý distributed lock trên Redis.
  - Thiết lập cơ chế TTL tự động giải phóng lock và hết hạn state nếu node quét gặp sự cố (OOM/Crash).
  - Giữ nguyên luồng WebSocket event emission qua `RedisIoAdapter` đã có sẵn trong hệ sinh thái.
- **Explicit Out-of-Scope**:
  - Tách worker probe thành microservice riêng hoặc tích hợp Bull Queue phức tạp (giữ trong module hiện tại kết hợp Redis Lock để đơn giản hóa kiến trúc).
  - Thay đổi cấu trúc cơ sở dữ liệu Postgres hoặc entity `NetworkDeviceEntity`.

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### So sánh các Phương án Kiến trúc (Solution Options):

| Tiêu chí | Phương án 1 (Khuyên dùng): Redis State + Distributed Mutex Lock | Phương án 2: Bull Queue Job Processor (@nestjs/bull) | Phương án 3: Database-backed Scan Session Record (TypeORM) |
| :--- | :--- | :--- | :--- |
| **Cơ chế chính** | Lưu state JSON & Atomic Lock trên Redis với TTL. | Đẩy scan job vào Bull Queue, 1 worker active xử lý. | Tạo bảng `network_scan_sessions` trong PostgreSQL. |
| **Độ phức tạp** | Thấp - Gọn gàng, tận dụng Redis có sẵn. | Trung bình - Cần setup Queue, Processor, Job event. | Trung bình - Tăng tải I/O DB cho các transient state ngắn hạn. |
| **Đồng bộ đa node** | Hoàn hảo (tất cả node đọc/ghi cùng Redis key). | Hoàn hảo (Bull tự quản lý state trên Redis). | Tốt, nhưng polling DB liên tục không tối ưu. |
| **Khả năng tự phục hồi** | Tốt nhờ Redis TTL (tự unlock khi quá hạn). | Tốt (Job lock timeout & retry). | Cần cronjob / worker dọn dẹp session bị treo. |

### Core Mechanism (Phương án 1 - Khuyên dùng)

1. **Redis Key Design**:
   - `network_device:scan_lock`: Lock key (SET `network_device:scan_lock` `<token>` `EX 300` `NX`) ngăn chặn scan đồng thời giữa các node.
   - `network_device:scan_state`: JSON string lưu trữ `ScanStatusResponseDto`:
     ```json
     {
       "status": "SCANNING",
       "devicesDiscoveredCount": 5,
       "startedAt": "2026-09-15T08:45:00.000Z",
       "completedAt": null
     }
     ```

2. **Logic Flow**:
   - **`triggerScan(subnet, timeoutMs)`**:
     1. Thử lấy lock: `SET network_device:scan_lock <lockToken> EX 300 NX`.
     2. Nếu không lấy được lock $\rightarrow$ Ném `NetworkDeviceError.ScanAlreadyInProgress` (HTTP 409).
     3. Khởi tạo state trên Redis (`status = SCANNING`, `devicesDiscoveredCount = 0`, `startedAt = now()`, TTL = 600s).
     4. Chạy background scan pipeline (ONVIF + ARP + TCP).
     5. Mỗi khi phát hiện thiết bị: Lưu DB $\rightarrow$ Tăng `devicesDiscoveredCount` trên Redis $\rightarrow$ Emit WebSocket `DEVICE_DISCOVERED`.
     6. Khi hoàn tất: Cập nhật Redis state (`status = COMPLETED`, `completedAt = now()`, TTL = 3600s) $\rightarrow$ Giải phóng lock an toàn bằng Lua script.
     7. Nếu xảy ra lỗi: Cập nhật Redis state (`status = FAILED`, `completedAt = now()`) $\rightarrow$ Giải phóng lock.
   - **`getScanStatus()`**:
     - Đọc trực tiếp từ Redis key `network_device:scan_state`. Nếu key không tồn tại $\rightarrow$ Trả về `NetworkScanStatus.IDLE` với `devicesDiscoveredCount = 0`.

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)
- **Node Crash mid-scan (Stale Lock Prevention)**: Lock key có TTL cứng 300 giây (5 phút). Nếu node bị sập đột ngột, lock sẽ tự động hết hạn, không làm treo vĩnh viễn tiến trình quét của hệ thống.
- **Safe Lock Release (Lua Script)**: Sử dụng Lua script đối chiếu `lockToken` trước khi xóa lock để đảm bảo node chạy chậm không xóa nhầm lock của một lượt quét mới vừa khởi tạo.
- **Redis Connection Failure Fallback**: Nếu Redis tạm thời gián đoạn kết nối, trả về lỗi rõ ràng hoặc fallback sang bộ nhớ đệm an toàn kèm log cảnh báo.
