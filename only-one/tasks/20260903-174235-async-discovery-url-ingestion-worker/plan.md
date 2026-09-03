---
status: done
slug: async-discovery-url-ingestion-worker
started_at: 2026-09-03
completed_at: 2026-09-03
pr_url: ~
branch: ~
---

# Plan: Asynchronous Discovery URL Ingestion Worker Pipeline

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- **Hiện trạng luồng thực thi**:
  - Tại [discovery-url.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-url.service.ts#L85-L132), phương thức `batchIngest(sessionId, urlIds)` nhận danh sách các URL đã duyệt (`finalValidationStatus = APPROVED`), sau đó duyệt qua từng phần tử bằng vòng lặp `for (const u of urls)` đồng bộ và gọi trực tiếp `this.ingestDiscoveredUrl(u.id)` trên cùng một tiến trình HTTP request.
  - Mỗi bước ingest trong [discovery-url.service.ts:L35-L84](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-url.service.ts#L35-L84) thực hiện nhiều truy vấn database: bóc tách SKU/code từ URL, tìm hoặc tạo bản ghi `ItemEntity` ([item.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/item.service.ts)), kiểm tra và tạo `DataProviderItemEntity` ([data-provider-item.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/data-provider-item.service.ts)), sau đó cập nhật trạng thái `DiscoveryUrlStatus.INGESTED`.
- **Điểm nghẽn kỹ thuật (Bottlenecks & Pain Points)**:
  1. **HTTP Request Blocking & Timeout**: Khi số lượng URL lớn ($50 - 500+$ URLs), request kéo dài hàng chục giây, dễ bị gateway timeout (`504 Gateway Timeout` / `Connection reset`).
  2. **Thiếu Concurrency & Worker Scaling**: Toàn bộ batch chạy đơn luồng (single-thread sequential) trên instance API, không tận dụng được tài nguyên của các worker node độc lập.
  3. **Thiếu Fault Isolation & Resiliency**: Lỗi ngoại lệ hoặc crash tiến trình giữa chừng làm mất dấu vết tiến độ; không có cơ chế retry tự động theo từng URL riêng biệt.
- **Danh sách hành vi bắt buộc giữ nguyên (Invariants)**:
  - **Invariant 1 (Hierarchical Resolution)**: Tiếp tục duy trì thứ tự phân giải sản phẩm: tìm theo `code` (SKU trích xuất từ URL) $\rightarrow$ tìm theo `name` $\rightarrow$ tạo mới `ItemEntity` nếu chưa tồn tại.
  - **Invariant 2 (Idempotent Mapping)**: Đảm bảo không tạo trùng `DataProviderItemEntity` nếu cặp `(itemId, itemUrl, dataProviderId)` đã tồn tại.
  - **Invariant 3 (Status Consistency)**: Cập nhật chính xác trạng thái URL sang `INGESTED` khi hoàn tất hoặc `FAILED` nếu có lỗi không thể phục hồi.

---

## Section 2. Detailed Design (Thiết kế Kỹ thuật Chi tiết)

### 2.1. Kiến trúc Hệ thống & Cơ chế Phân tán
- **Queue Decoupling (`QueueModule` & `WorkerModule`)**:
  - Định nghĩa hàng đợi mới `QUEUE_NAME.DISCOVERY_INGESTION_JOB = 'discovery-ingestion-job'`.
  - Định nghĩa interface payload `IDiscoveryIngestionJob` (`urlId`, `sessionId`, `dataProviderId`).
  - Đăng ký queue vào `QueueModule` ([queue.module.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/queue/queue.module.ts)) và inject vào `QueueService` ([queue.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/queue/services/queue.service.ts)).
- **Processor Design (`DiscoveryIngestionWorkerProcessor`)**:
  - Đặt tại `src/modules/worker/processors/discovery-ingestion-worker.processor.ts`.
  - Cấu hình `@Process({ concurrency: 5 })` để xử lý song song tối đa 5 jobs/worker node.
  - Xử lý từng URL trong database transaction atomic: cập nhật `status = INGESTING`, gọi logic phân giải tạo Item/DataProviderItem, cập nhật `status = INGESTED`. Khi thất bại, cập nhật `status = FAILED` kèm error logging.
- **Refactoring `DiscoveryUrlService.batchIngest`**:
  - Chuyển `batchIngest` sang mô hình non-blocking: cập nhật trạng thái các URL thỏa mãn sang `DiscoveryUrlStatus.QUEUED`, đẩy mảng jobs qua `queueService.addBulkJob(...)`, và trả về `IngestDiscoveryUrlResponseDto` ngay lập tức với `{ totalProcessed, totalQueued, sessionId }`.

### 2.2. Phản biện Red-Team (`doubt-driven-development`)
- **CLAIM**: Chuyển `batchIngest` sang async queue có thể làm mất kết quả thống kê chi tiết (`itemsCreated`, `itemsReused`) ngay trong response của HTTP POST.
- **DOUBT**: Client/FE có cần ngay lập tức con số `itemsCreated` trong response trả về hay không?
- **RECONCILE**: Trong mô hình background processing, phản hồi HTTP chỉ xác nhận số lượng URL đã tiếp nhận (`totalQueued`). Tiến độ và kết quả chi tiết của từng URL được phản ánh trực tiếp qua trạng thái bản ghi `discovery_urls` (`status: queued -> ingesting -> ingested / failed`). Client có thể refetch hoặc polling danh sách URLs theo session để hiển thị badge trạng thái chính xác.

---

## Section 3. Implementation Architecture & Machine-Readable Task Matrix

### 3.1 Machine-Readable Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Reused Existing Utilities / Helpers | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/queue/enums/queue-name.enum.ts` | `QUEUE_NAME.DISCOVERY_INGESTION_JOB` | None | `None` | `npm run build` |
| **2** | `[x]` | `[NEW]` | `src/modules/queue/interfaces/discovery-ingestion-job-queue.interface.ts` | `IDiscoveryIngestionJob` | None | `Order 1` | `npm run build` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/queue/interfaces/index.ts` | Export `discovery-ingestion-job-queue.interface` | None | `Order 2` | `npm run build` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/queue/queue.module.ts` | Register `QUEUE_NAME.DISCOVERY_INGESTION_JOB` | `@nestjs/bull (registerQueue)` | `Order 1` | `npm run build` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/queue/services/queue.service.ts` | Inject `discoveryIngestionQueue` & register | `LoggerService` | `Order 4` | `npm run build` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/responses/ingest-discovery-url-response.dto.ts` | `IngestDiscoveryUrlResponseDto.totalQueued, sessionId` | `ApiProperty` | `None` | `npm run build` |
| **7** | `[x]` | `[NEW]` | `src/modules/worker/processors/discovery-ingestion-worker.processor.ts` | `DiscoveryIngestionWorkerProcessor.process` | `DiscoveryUrlEntity, ItemService, DataProviderItemService` | `Order 5` | `npm run build` |
| **8** | `[x]` | `[MODIFY]` | `src/modules/worker/worker.module.ts` | Register `DiscoveryIngestionWorkerProcessor` in `processors` array | `AppConfigService` | `Order 7` | `npm run build` |
| **9** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-url.service.ts` | `DiscoveryUrlService.batchIngest` dispatch to `QueueService` | `QueueService, DiscoveryUrlStatus` | `Order 5, Order 6` | `npm run build` |
| **10** | `[x]` | `[MODIFY]` | `src/modules/data-provider/_tests/discovery-url.service.spec.ts` | Unit tests for async `batchIngest` dispatch | `jest.mock` | `Order 9` | `npm run build` |
| **11** | `[x]` | `[NEW]` | `src/modules/worker/_tests/discovery-ingestion-worker.processor.spec.ts` | Unit tests for `DiscoveryIngestionWorkerProcessor` | `jest.mock, DataSource, DiscoveryUrlEntity` | `Order 7` | `npm run build` |

### 3.2. Cây cấu trúc file & Luồng Dữ liệu (Scaffold Tree)

```text
src/
├── modules/
│   ├── queue/
│   │   ├── enums/
│   │   │   └── queue-name.enum.ts                     [MODIFY: Add DISCOVERY_INGESTION_JOB]
│   │   ├── interfaces/
│   │   │   ├── discovery-ingestion-job-queue.interface.ts [NEW: Define IDiscoveryIngestionJob]
│   │   │   └── index.ts                               [MODIFY: Export new interface]
│   │   ├── queue.module.ts                            [MODIFY: Register Bull queue]
│   │   └── services/
│   │       └── queue.service.ts                       [MODIFY: Inject & register queue]
│   ├── worker/
│   │   ├── processors/
│   │   │   └── discovery-ingestion-worker.processor.ts [NEW: Background worker logic]
│   │   ├── _tests/
│   │   │   └── discovery-ingestion-worker.processor.spec.ts [NEW: Worker processor tests]
│   │   └── worker.module.ts                           [MODIFY: Register processor in module]
│   └── data-provider/
│       ├── dtos/responses/
│       │   └── ingest-discovery-url-response.dto.ts   [MODIFY: Add totalQueued & sessionId]
│       ├── services/
│       │   └── discovery-url.service.ts               [MODIFY: Refactor batchIngest with QueueService]
│       └── _tests/
│           └── discovery-url.service.spec.ts          [MODIFY: Update service unit test suite]
```

---

## Section 4. Implementation Code Examples (Mẫu Code Triển khai)

### 4.1. Queue Enum & Interface Definitions
- **File**: `src/modules/queue/enums/queue-name.enum.ts` (Order 1)
```typescript
// [TARGET SEAM] Add DISCOVERY_INGESTION_JOB to QUEUE_NAME enum
// [RATIONALE] Establishes standard queue identification across Producer and Consumer
export enum QUEUE_NAME {
    SCRAPING_JOB = 'scraping-job',
    DISCOVERY_VALIDATION_JOB = 'discovery-validation-job',
    DISCOVERY_INGESTION_JOB = 'discovery-ingestion-job',
}
```

- **File**: `src/modules/queue/interfaces/discovery-ingestion-job-queue.interface.ts` (Order 2)
```typescript
// [TARGET SEAM] Define payload contract for ingestion worker job
// [RATIONALE] Ensures strict type safety when dispatching and consuming Bull jobs
export interface IDiscoveryIngestionJob {
    urlId: string;
    sessionId: string;
    dataProviderId: string;
}
```

### 4.2. Ingestion Worker Processor Implementation
- **File**: `src/modules/worker/processors/discovery-ingestion-worker.processor.ts` (Order 7)
```typescript
import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { DataSource, Repository } from 'typeorm';

import { LoggerService } from '../../../shared/services/logger.service';
import { DiscoveryUrlEntity } from '../../data-provider/entities/discovery-url.entity';
import { DiscoveryUrlStatus } from '../../data-provider/enums';
import { DiscoveryUrlService } from '../../data-provider/services/discovery-url.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoveryIngestionJob } from '../../queue/interfaces';

export type DiscoveryIngestionJobType = Job<IDiscoveryIngestionJob>;

@Processor(QUEUE_NAME.DISCOVERY_INGESTION_JOB)
@Injectable()
export class DiscoveryIngestionWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoveryIngestionWorkerProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly discoveryUrlService: DiscoveryUrlService,
        @InjectRepository(DiscoveryUrlEntity)
        private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
    ) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 5 })
    async process(job: DiscoveryIngestionJobType): Promise<void> {
        const { urlId, sessionId } = job.data;
        this.loggerService.log(`Processing ingestion job ${job.id} for URL ${urlId} (Session: ${sessionId})`);

        const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
        if (!urlEntity) {
            this.loggerService.warn(`Skipping job ${job.id}: Discovery URL ${urlId} not found`);
            return;
        }

        try {
            await this.discoveryUrlService.ingestDiscoveredUrl(urlId);
            this.loggerService.log(`Successfully ingested discovery URL ${urlId}`);
        } catch (error) {
            this.loggerService.error(`Failed to ingest discovery URL ${urlId}: ${error?.message}`);
            await this.discoveryUrlRepository.update(urlId, {
                status: DiscoveryUrlStatus.FAILED,
            });
            throw error;
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoveryIngestionJobType): Promise<void> {
        this.loggerService.log(`Discovery ingestion job ${job.id} for URL ${job.data.urlId} completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoveryIngestionJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery ingestion job ${job.id} failed: ${err?.message}`);
    }
}
```

### 4.3. Refactored `DiscoveryUrlService.batchIngest`
- **File**: `src/modules/data-provider/services/discovery-url.service.ts` (Order 9)
```typescript
// [TARGET SEAM] Refactor batchIngest to dispatch Bull jobs instead of synchronous loop
// [RATIONALE] Prevents API server thread blocking, achieves sub-second HTTP responses, enables concurrency
    async batchIngest(sessionId: string, urlIds?: string[]): Promise<IngestDiscoveryUrlResponseDto> {
        const session = await this.discoverySessionRepository.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException(`Discovery session not found with id: ${sessionId}`);

        const whereCondition: FindOptionsWhere<DiscoveryUrlEntity> = { sessionId };
        if (urlIds && urlIds.length > 0) {
            whereCondition.id = In(urlIds);
        } else {
            whereCondition.finalValidationStatus = FinalValidationStatus.APPROVED;
        }

        const urls = await this.discoveryUrlRepository.find({ where: whereCondition });
        if (!urls.length) {
            return new IngestDiscoveryUrlResponseDto({
                totalProcessed: 0,
                totalQueued: 0,
                sessionId,
                itemsCreated: 0,
                itemsReused: 0,
                dataProviderItemsCreated: 0,
            });
        }

        // Mark URLs as QUEUED to prevent duplicate dispatches
        const targetUrlIds = urls.map((u) => u.id);
        await this.discoveryUrlRepository.update({ id: In(targetUrlIds) }, { status: DiscoveryUrlStatus.QUEUED });

        // Dispatch bulk jobs to Redis queue
        const jobs = urls.map((u) => ({
            data: {
                urlId: u.id,
                sessionId: u.sessionId,
                dataProviderId: u.dataProviderId,
            },
            opts: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
            },
        }));

        await this.queueService.addBulkJob(QUEUE_NAME.DISCOVERY_INGESTION_JOB, jobs);

        return new IngestDiscoveryUrlResponseDto({
            totalProcessed: urls.length,
            totalQueued: urls.length,
            sessionId,
            itemsCreated: 0,
            itemsReused: 0,
            dataProviderItemsCreated: 0,
        });
    }
```

---

## Section 5. Test Cases (Kịch bản Kiểm thử & Nghiệm thu)

### Scenario 1: Successful Batch Ingestion Dispatch (Happy Path)
- **Objective**: Kiểm tra API `batchIngest` dispatch toàn bộ URL hợp lệ vào queue và cập nhật trạng thái `QUEUED`.
- **Precondition**: Tồn tại Discovery Session `session-1` chứa 3 URL đã duyệt (`finalValidationStatus = APPROVED`).
- **Action**: Gọi `discoveryUrlService.batchIngest('session-1')`.
- **Expected Result**:
  - `discoveryUrlRepository.update` được gọi với status `QUEUED` cho cả 3 URL.
  - `queueService.addBulkJob` được gọi với đúng `QUEUE_NAME.DISCOVERY_INGESTION_JOB` và 3 jobs.
  - DTO trả về `{ totalProcessed: 3, totalQueued: 3, sessionId: 'session-1' }`.

### Scenario 2: Worker Ingestion Execution (Worker Happy Path)
- **Objective**: Kiểm tra `DiscoveryIngestionWorkerProcessor` tiêu thụ job thành công và chuyển trạng thái sang `INGESTED`.
- **Precondition**: Job chứa `{ urlId: 'url-1', sessionId: 'session-1', dataProviderId: 'dp-1' }` được đưa vào queue.
- **Action**: `DiscoveryIngestionWorkerProcessor.process(job)` được gọi.
- **Expected Result**:
  - `discoveryUrlService.ingestDiscoveredUrl('url-1')` được thực thi.
  - URL được cập nhật trạng thái `DiscoveryUrlStatus.INGESTED`.

### Scenario 3: Worker Error Handling & Fault Isolation (Worker Failure Path)
- **Objective**: Kiểm tra khi `ingestDiscoveredUrl` ném ngoại lệ, URL được đánh dấu `FAILED` và không làm crash worker.
- **Precondition**: `ingestDiscoveredUrl('url-bad')` ném lỗi DB hoặc validation.
- **Action**: `DiscoveryIngestionWorkerProcessor.process(job)` được gọi với `urlId: 'url-bad'`.
- **Expected Result**:
  - URL được cập nhật `status = DiscoveryUrlStatus.FAILED`.
  - Ngoại lệ được rethrow để Bull ghi nhận failed attempt và retry theo backoff.

### Comprehensive Test Command
```bash
npm test src/modules/data-provider/_tests/discovery-url.service.spec.ts
npm test src/modules/worker/_tests/discovery-ingestion-worker.processor.spec.ts
npm run lint
```

---

## Section 6. Technical English Key Patterns

### 1. Invariant Preservation (Noun Phrase)
- **Meaning (VI)**: Bảo toàn các điều kiện bất biến (những quy tắc nghiệp vụ cốt lõi không được phép vi phạm khi refactor).
- **Grammar / Usage**: `ensure / guarantee / uphold + invariant preservation`
- **Engineering Example**: *"Refactoring the batch ingestion logic to an asynchronous worker queue upholds invariant preservation regarding product deduplication and entity resolution."*

### 2. At-Least-Once Delivery & Idempotent Consumer (Architectural Idiom)
- **Meaning (VI)**: Cơ chế phân phối thông điệp ít nhất một lần kết hợp với bộ tiêu thụ có tính bất biến/chống trùng lặp.
- **Grammar / Usage**: `pair [messaging system] with an idempotent consumer`
- **Engineering Example**: *"Because Redis Bull queues operate under at-least-once delivery semantics, the ingestion processor must act as an idempotent consumer."*

### 3. Backoff Strategy (Noun Phrase)
- **Meaning (VI)**: Chiến lược giãn cách thời gian giữa các lần thử lại khi gặp lỗi (tránh gây dồn dập quá tải hệ thống).
- **Grammar / Usage**: `exponential / linear + backoff strategy`
- **Engineering Example**: *"We configured an exponential backoff strategy for transient ingestion failures to avoid overwhelming the downstream database."*
