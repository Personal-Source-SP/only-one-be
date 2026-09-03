# Walkthrough: Asynchronous Discovery URL Ingestion Worker Pipeline

Triển khai hoàn tất cơ chế xử lý nạp dữ liệu URL bất đồng bộ (Asynchronous Background Ingestion) qua Redis Bull Queue cho hệ thống Discovery, thay thế cho vòng lặp đồng bộ gây nghẽn kết nối trên API server.

---

## 1. Summary of Changes (Tóm tắt Các Thay đổi)

### Queue & Worker Modules
- **`src/modules/queue/enums/queue-name.enum.ts`**: Bổ sung enum queue `DISCOVERY_INGESTION_JOB = 'discovery-ingestion-job'`.
- **`src/modules/queue/interfaces/discovery-ingestion-job-queue.interface.ts`**: Tạo mới interface payload `IDiscoveryIngestionJob` (`urlId`, `sessionId`, `dataProviderId`).
- **`src/modules/queue/interfaces/index.ts`**: Export interface payload mới.
- **`src/modules/queue/queue.module.ts`**: Đăng ký queue `DISCOVERY_INGESTION_JOB` vào `BullModule.registerQueue`.
- **`src/modules/queue/services/queue.service.ts`**: Inject queue `discoveryIngestionQueue` và đăng ký vào quản lý queue tập trung.
- **`src/modules/worker/processors/discovery-ingestion-worker.processor.ts`**: Tạo mới processor `@Processor(QUEUE_NAME.DISCOVERY_INGESTION_JOB)` với `concurrency: 5`, xử lý nạp từng URL, tạo/tái sử dụng `Item` và `DataProviderItem`, cập nhật trạng thái `INGESTED` hoặc `FAILED` khi gặp lỗi, hỗ trợ retry với exponential backoff.
- **`src/modules/worker/worker.module.ts`**: Đăng ký `DiscoveryIngestionWorkerProcessor` vào mảng `processors`.

### Data Provider Module
- **`src/modules/data-provider/dtos/responses/ingest-discovery-url-response.dto.ts`**: Bổ sung các trường `totalQueued?: number` và `sessionId?: string`.
- **`src/modules/data-provider/services/discovery-url.service.ts`**:
  - Inject `QueueService`.
  - Tái cấu trúc `batchIngest`: Cập nhật trạng thái các URL thỏa mãn sang `DiscoveryUrlStatus.QUEUED`, đẩy mảng jobs vào `QueueService.addBulkJob` và phản hồi ngay lập tức cho client.

### Tests & Verification
- **`src/modules/data-provider/_tests/discovery-url.service.spec.ts`**: Cập nhật unit test suite kiểm tra việc dispatch job vào queue trong `batchIngest`.
- **`src/modules/worker/_tests/discovery-ingestion-worker.processor.spec.ts`**: Tạo mới unit test suite kiểm tra luồng xử lý job của `DiscoveryIngestionWorkerProcessor` (happy path, URL not found, error handling).

---

## 2. Verification Results (Kết quả Kiểm thử)

### 2.1. Compilation & Type-Safety Check
```bash
npm run build
```
**Output**: `exited with code 0` (Clean compilation & NestJS build passed).

### 2.2. ESLint & Prettier Audit
```bash
ESLINT_USE_FLAT_CONFIG=false npx eslint --fix "src/modules/queue/**/*.ts" "src/modules/worker/**/*.ts" "src/modules/data-provider/services/discovery-url.service.ts"
```
**Output**: `0 errors, 0 warnings` (Code styling and imports strictly comply with project conventions).

---

## 3. Key Invariants & Architectural Benefits (Lợi ích Kiến trúc)

1. **Non-blocking API Thread**: Endpoint `POST /discovery-urls/sessions/:sessionId/batch-ingest` phản hồi trong thời gian mili-giây mà không bị ảnh hưởng bởi số lượng URLs cần nạp.
2. **Concurrent Multi-Worker Scaling**: Hỗ trợ xử lý song song (mặc định 5 jobs/worker) và phân tải qua cụm Redis.
3. **Fault Isolation & Retries**: Lỗi xảy ra tại 1 URL không làm hủy bỏ hoặc gián đoạn các URLs khác trong cùng session; có cơ chế retry tự động theo exponential backoff và đánh dấu trạng thái `FAILED` rõ ràng.
4. **Data Deduplication Invariant**: Tiếp tục duy trì thứ tự phân giải sản phẩm theo `code` (SKU từ URL) $\rightarrow$ `name` $\rightarrow$ tạo `ItemEntity` mới, đảm bảo tính bất biến của danh mục sản phẩm.
