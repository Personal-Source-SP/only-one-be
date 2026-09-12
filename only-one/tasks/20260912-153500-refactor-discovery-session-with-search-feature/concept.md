# Concept: Tái cấu trúc Discovery Session tích hợp Data Provider Search Feature & Bull Queue Worker

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Khi khởi tạo phiên khám phá (`DiscoverySession`), hệ thống yêu cầu người dùng phải tự nhập thủ công `targetUrl`, trong khi các thông tin URL pattern và cấu hình tìm kiếm (`searchUrlPattern`, `maxResults`) đã có sẵn trong `DataProviderFeature (type = SEARCH)`.
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  1. `CreateDiscoverySessionRequestDto` bắt buộc nhập `targetUrl` thủ công và chưa hỗ trợ mảng từ khóa `targetKeywords: string[]`.
  2. `DiscoverySessionEntity` chứa trường không cần thiết (`notes`), chưa lưu trữ mảng từ khóa `targetKeywords: string[]`.
  3. Tồn tại file `discovery.runner.ts` thừa thãi, tự triển khai lại logic cào dữ liệu lặp lại và tạo ra quan hệ phụ thuộc vòng `forwardRef` với `DiscoverySessionService`.
  4. Việc thực thi cào dữ liệu chạy ngầm qua Promise không được quản lý hàng đợi, dễ gây quá tải I/O nếu có nhiều từ khóa hoặc mất dấu vết khi server khởi động lại.
- **Nguyên nhân cốt lõi (Root Cause)**: Module Discovery Session chưa được phân rã thành các background worker jobs độc lập qua BullMQ và chưa loại bỏ class runner dư thừa.
- **Tác động (Impact / Blast Radius)**: Khó kiểm soát tải, duplicate code fetch/extract, phụ thuộc vòng (`forwardRef`).

---

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**:
  - Tự động sinh `targetUrl` từ cấu hình `SEARCH` feature của Data Provider kết hợp danh sách từ khóa `targetKeywords: string[]`.
  - Giữ lại trường `targetUrl: string` trong `DiscoverySessionEntity` để lưu snapshot URL/Pattern gốc.
  - Thêm trường `targetKeywords: string[]` (dạng `jsonb`) vào `DiscoverySessionEntity`, `DiscoverySessionDto`, và `CreateDiscoverySessionRequestDto`.
  - Xóa bỏ trường `notes` khỏi `DiscoverySessionEntity` và DTOs.
  - **Xóa bỏ hoàn toàn file `discovery.runner.ts`**: Chuyển toàn bộ logic thực thi tìm kiếm theo keyword vào `DiscoverySessionService.processDiscoverySearch(sessionId, keyword)`.
  - **Phân rã tác vụ tìm kiếm theo từng từ khóa thành Bull Queue Job (`QUEUE_NAME.DISCOVERY_SEARCH_JOB`)**: Mỗi keyword sinh ra 1 work process độc lập được xử lý bởi `DiscoverySearchWorkerProcessor`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - `DiscoverySessionEntity`: Lưu `targetUrl: string`, `targetKeywords: string[]`, loại bỏ hoàn toàn `notes`.
  - `CreateDiscoverySessionRequestDto`: Chỉ sử dụng duy nhất `targetKeywords?: string[]`, `maxUrls?: number` (override). `targetUrl` được tự động tạo từ search feature pattern.
  - `QueueModule`: Bổ sung `QUEUE_NAME.DISCOVERY_SEARCH_JOB` và interface `IDiscoverySearchJob`.
  - `WorkerModule`: Bổ sung `DiscoverySearchWorkerProcessor` gọi `discoverySessionService.processDiscoverySearch(sessionId, keyword)` với `concurrency: 3`.
  - `discovery.runner.ts`: **Được xóa bỏ hoàn toàn**, giải phóng phụ thuộc vòng `forwardRef`.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Backend Entity: `DiscoverySessionEntity` giữ `targetUrl`, thêm `targetKeywords: string[]` (jsonb), xóa `notes`.
  - Backend DTO: `CreateDiscoverySessionRequestDto` và `DiscoverySessionDto` chỉ dùng `targetKeywords: string[]`, bỏ `notes` và `targetKeyword`.
  - Backend Queue & Worker: Thêm `QUEUE_NAME.DISCOVERY_SEARCH_JOB`, `IDiscoverySearchJob`, `DiscoverySearchWorkerProcessor`.
  - Backend Service: `DiscoverySessionService` tạo session, enqueue jobs và thực thi `processDiscoverySearch`.
  - Backend Runner: Xóa bỏ `discovery.runner.ts`, bỏ khai báo trong `DataProviderModule`.
  - Frontend: `CreateSessionModal.tsx` và `types.ts` cập nhật hỗ trợ nhập `targetKeywords: string[]`.
- **Explicit Out-of-Scope**:
  - Thay đổi logic core của `ScrapingFeatureRunner`.

---

## 3. Proposed Solutions & Architecture (Các Phương án Thiết kế)

### Cơ chế Vận hành Bull Queue Worker Process cho từng Keyword
```
[Client / FE] ---> CreateDiscoverySessionRequestDto (targetKeywords: ['sony', 'iphone'])
       |
       v
[DiscoverySessionService.create]
       |---> Tạo DiscoverySessionEntity
       |---> Enqueue Bull Jobs vào DISCOVERY_SEARCH_JOB:
                 Job 1: { sessionId, keyword: 'sony' }
                 Job 2: { sessionId, keyword: 'iphone' }
       v
[DiscoverySearchWorkerProcessor] (@Process({ concurrency: 3 }))
       |---> Nhận từng Job { sessionId, keyword }
       |---> Gọi DiscoverySessionService.processDiscoverySearch(sessionId, keyword)
                 |---> SearchFeatureRunner.buildSearchUrl(searchConfig, { query: keyword })
                 |---> DATA_PROVIDER_SEARCH_SERVICE_MAP[service].getExtractSearchData({ url, targetConfig })
                 |---> Deduplicate & Save DiscoveryUrlEntity
                 |---> Cập nhật session totalDiscovered, totalValidated
                 |---> Trigger DiscoveryValidationService.startBatchValidation nếu autoValidate
```
