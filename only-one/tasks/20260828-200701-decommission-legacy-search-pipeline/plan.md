---
status: done
slug: decommission-legacy-search-pipeline
started_at: 2026-08-28
completed_at: 2026-08-28
pr_url: ~
branch: ~
---

# Plan: Decommission Legacy Search Pipeline & Consolidate into Discovery Engine

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

### 1.1 Phân tích Hiện trạng & Luồng thực thi cũ
Trước khi hệ thống phát triển bộ tính năng **Discovery & Validation Engine** (`DiscoverySession`, `DiscoveryUrl`, `DiscoveryValidationBatch`, `DiscoveryValidationLog`), hệ thống duy trì song song một chuỗi xử lý tìm kiếm thô (Search Pipeline) bao gồm:
- [data-provider-search.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search.service.ts) & [generic-data-provider-search.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts): Service tìm kiếm qua query/barcode và mapping factory `DATA_PROVIDER_SEARCH_SERVICE_MAP`.
- [data-provider-search.controller.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/data-provider-search.controller.ts): Endpoint `POST /data-providers/search`.
- [search-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts) & [feature-runner.registry.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/feature-runner.registry.ts#L12-L16): Runner đăng ký trong strategy registry cho tính năng `DataProviderFeatureType.SEARCH`.
- [search-schedule.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/schedule-execution/search-schedule.service.ts) & [schedule.module.ts](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/schedule.module.ts#L50-L55): Service lập lịch định kỳ đẩy job tìm kiếm vào hàng đợi `QUEUE_NAME.SEARCH_JOB`.
- [search-worker.processor.ts](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/search-worker.processor.ts) & [worker.module.ts](file:///d:/Sources/Personal/only-one-be/src/modules/worker/worker.module.ts#L9-L11): Bull queue processor tiêu thụ job `search-job`.
- [queue.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/queue/services/queue.service.ts#L17-L20) & [queue.module.ts](file:///d:/Sources/Personal/only-one-be/src/modules/queue/queue.module.ts#L18-L20): Đăng ký và quản lý hàng đợi `search-job`.

### 1.2 Vấn đề Kỹ thuật Cần giải quyết
- **Redundant Pipelines**: Cả hai hệ thống (Search cũ vs Discovery mới) đều phục vụ mục đích khám phá URL và dữ liệu từ website nguồn. Pipeline Search cũ không còn đối tượng lưu trữ (vì `draft_items` đã bị xóa) và hoàn toàn bị áp đảo bởi khả năng crawl, evaluate confidence, trích xuất metadata và review URL của **Discovery Engine**.
- **Runtime Resource Waste**: Việc duy trì hàng đợi BullMQ `search-job`, worker processor và schedule map `ExecutionServiceEnum.SEARCH` gây lãng phí tài nguyên và tăng độ phức tạp vận hành.
- **Architectural Cohesion**: Cần tháo dỡ toàn bộ chuỗi phụ thuộc Search cũ nhưng **bảo tồn `DataProviderFeatureType.SEARCH`** để tiếp tục làm cấu hình và định danh tính năng Discovery cho DataProvider.

### 1.3 Danh sách Invariants (Hành vi bắt buộc giữ vững)
1. **Discovery Engine Intact**: Toàn bộ luồng `DiscoverySessionController`, `DiscoverySessionService`, `DiscoveryUrlService`, `DiscoveryValidationService`, `DiscoveryRunnerService` hoạt động độc lập 100%.
2. **Feature Type Preservation**: `DataProviderFeatureType.SEARCH` (giá trị `'search'`) tiếp tục tồn tại để định nghĩa cấu hình và khả năng Discovery trên các Data Provider.
3. **Scraping Pipeline Intact**: Toàn bộ `ScrapingFeatureRunner`, `ScrapingWorkerProcessor`, `DataProviderScheduleService`, `QUEUE_NAME.SCRAPING_JOB` không bị ảnh hưởng.

---

## Section 2. Detailed Design (Thiết kế Kỹ thuật Chi tiết)

### 2.1 Kiến trúc Tháo dỡ Toàn diện (End-to-End Teardown Architecture)
Áp dụng nguyên tắc **Clean Separation & Zero Dead-Code**:
1. **Queue & Worker Layer**:
   - Xóa bỏ hàng đợi `QUEUE_NAME.SEARCH_JOB` khỏi `queue.module.ts` và `queue.service.ts`.
   - Xóa file `search-worker.processor.ts`, test spec và gỡ khỏi `worker.module.ts`.
   - Xóa enum `QUEUE_NAME.SEARCH_JOB` và interface `ISearchJobQueueInterface`.
2. **Schedule Layer**:
   - Xóa `SearchScheduleService`, test spec `search-schedule.service.spec.ts`.
   - Gỡ bỏ `ExecutionServiceEnum.SEARCH` khỏi `schedule-execution.enum.ts` và `SCHEDULE_EXECUTION_SERVICE_MAP` trong `schedule.module.ts`.
3. **Data Provider Layer**:
   - Xóa `DataProviderSearchController`, `DataProviderSearchService`, `GenericDataProviderSearchService`, `SearchFeatureRunner`.
   - Cập nhật `FeatureRunnerRegistry` chỉ còn inject `ScrapingFeatureRunner`.
   - Xóa constants `data-provider-search-service-map.ts`, interfaces `data-provider-search-service.interface.ts`, `search-config.interface.ts`.
   - Xóa các DTOs: `process-search-data-request.dto.ts`, `search-items-request.dto.ts`, `process-search-data-response.dto.ts`, `search-items-response.dto.ts`.
   - Xóa enum `data-provider-search-status.enum.ts`.
   - Cập nhật `DataProviderModule` và các barrel exports.

```
       [ BEFORE TEARDOWN ]                                    [ AFTER TEARDOWN ]
+--------------------------------+                    +--------------------------------+
|     SearchScheduleService      |                    |     DiscoverySessionService    |
|               |                |                    |               |                |
|               v                |                    |               v                |
|      QUEUE: SEARCH_JOB         |                    |     DiscoveryRunnerService     |
|               |                |                    |    (Crawls & validates URLs)   |
|               v                |                    +--------------------------------+
|     SearchWorkerProcessor      |                                    |
|               |                |                                    v
|               v                |                    +--------------------------------+
|   DataProviderSearchService    |                    |         DiscoveryUrl           |
|               |                |                    |  (Approved -> Batch Enqueue)   |
|               v                |                    +--------------------------------+
|      SearchFeatureRunner       |                                    |
+--------------------------------+                                    v
            [DELETED]                                 +--------------------------------+
                                                      |      ScrapingData Queue        |
                                                      |   (QUEUE_NAME.SCRAPING_JOB)    |
                                                      +--------------------------------+
```

### 2.2 Red-Team Adversarial Assessment (`doubt-driven-development`)
- **CLAIM**: Xóa `SearchFeatureRunner` sẽ khiến `FeatureRunnerRegistry` không xử lý được khi người dùng test tính năng `type: 'search'`.
- **DOUBT**: Nếu người dùng gọi `POST /data-provider-features/:id/test` với feature type là `SEARCH`, `FeatureRunnerRegistry.getRunner(type)` sẽ ném `BadRequestException` vì không tìm thấy runner.
- **RECONCILE**: Tính năng Discovery được kích hoạt và kiểm thử trực tiếp thông qua dedicated endpoint `POST /discovery-sessions` (chạy qua `DiscoveryRunnerService` / `DiscoverySessionService`) chứ không chạy sandbox stateless qua `IFeatureRunner`. Việc tách bạch này chuẩn hóa ranh giới nghiệp vụ giữa Scraping Sandbox Runner và Discovery Engine Session.

---

## Section 3. Implementation Architecture & Machine-Readable Task Matrix

### 3.1 Machine-Readable Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/queue/enums/queue-name.enum.ts` | `QUEUE_NAME` (remove `SEARCH_JOB`) | `None` | `npm test` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/queue/services/queue.service.ts` | `QueueService` (remove `searchJobQueue`) | `Order 1` | `npm test` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/queue/queue.module.ts` | `QueueModule` (remove `SEARCH_JOB` registration) | `Order 1` | `npm test` |
| **4** | `[x]` | `[DELETE]` | `src/modules/queue/interfaces/search-job-queue.interface.ts` | `ISearchJobQueueInterface` | `None` | `npm test` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/queue/interfaces/index.ts` | Barrel exports | `Order 4` | `npm test` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/schedule/enums/schedule-execution.enum.ts` | `ExecutionServiceEnum` (remove `SEARCH`) | `None` | `npm test` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/schedule/schedule.module.ts` | `ScheduleExecutorModule` (remove `SearchScheduleService`) | `Order 6` | `npm test` |
| **8** | `[x]` | `[DELETE]` | `src/modules/schedule/services/schedule-execution/search-schedule.service.ts` | `SearchScheduleService` | `Order 7` | `npm test` |
| **9** | `[x]` | `[DELETE]` | `src/modules/schedule/_tests/search-schedule.service.spec.ts` | `SearchScheduleService Spec` | `Order 8` | `npm test` |
| **10** | `[x]` | `[MODIFY]` | `src/modules/worker/worker.module.ts` | `WorkerModule` (remove `SearchWorkerProcessor`) | `None` | `npm test` |
| **11** | `[x]` | `[DELETE]` | `src/modules/worker/processors/search-worker.processor.ts` | `SearchWorkerProcessor` | `Order 10` | `npm test` |
| **12** | `[x]` | `[DELETE]` | `src/modules/worker/_tests/search-worker.processor.spec.ts` | `SearchWorkerProcessor Spec` | `Order 11` | `npm test` |
| **13** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/feature-runner.registry.ts` | `FeatureRunnerRegistry` (remove `SearchFeatureRunner`) | `None` | `npm test` |
| **14** | `[x]` | `[DELETE]` | `src/modules/data-provider/runners/search-feature.runner.ts` | `SearchFeatureRunner` | `Order 13` | `npm test` |
| **15** | `[x]` | `[DELETE]` | `src/modules/data-provider/controllers/data-provider-search.controller.ts` | `DataProviderSearchController` | `None` | `npm test` |
| **16** | `[x]` | `[DELETE]` | `src/modules/data-provider/services/data-provider-search.service.ts` | `DataProviderSearchService` | `None` | `npm test` |
| **17** | `[x]` | `[DELETE]` | `src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts` | `GenericDataProviderSearchService` | `None` | `npm test` |
| **18** | `[x]` | `[DELETE]` | `src/modules/data-provider/constants/data-provider-search-service-map.ts` | `DATA_PROVIDER_SEARCH_SERVICE_MAP` | `None` | `npm test` |
| **19** | `[x]` | `[DELETE]` | `src/modules/data-provider/interfaces/data-provider-search-service.interface.ts` | `IDataProviderSearchService` | `None` | `npm test` |
| **20** | `[x]` | `[DELETE]` | `src/modules/data-provider/interfaces/search-config.interface.ts` | `ISearchConfig` | `None` | `npm test` |
| **21** | `[x]` | `[DELETE]` | `src/modules/data-provider/dtos/requests/search-items-request.dto.ts` | `SearchItemsRequestDto` | `None` | `npm test` |
| **22** | `[x]` | `[DELETE]` | `src/modules/data-provider/dtos/requests/process-search-data-request.dto.ts` | `ProcessSearchDataRequestDto` | `None` | `npm test` |
| **23** | `[x]` | `[DELETE]` | `src/modules/data-provider/dtos/responses/search-items-response.dto.ts` | `SearchItemsResponseDto` | `None` | `npm test` |
| **24** | `[x]` | `[DELETE]` | `src/modules/data-provider/dtos/responses/process-search-data-response.dto.ts` | `ProcessSearchDataResponse` | `None` | `npm test` |
| **25** | `[x]` | `[DELETE]` | `src/modules/data-provider/enums/data-provider-search-status.enum.ts` | `DataProviderSearchStatus` | `None` | `npm test` |
| **26** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | `DataProviderModule` (clean controllers, providers, exports) | `Order 14, 15, 16, 17, 18` | `npm run build` |
| **27** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/index.ts` | Barrel exports | `Order 19, 20` | `npm run build` |
| **28** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/requests/index.ts` | Barrel exports | `Order 21, 22` | `npm run build` |
| **29** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/responses/index.ts` | Barrel exports | `Order 23, 24` | `npm run build` |
| **30** | `[x]` | `[MODIFY]` | `src/modules/data-provider/enums/index.ts` | Barrel exports | `Order 25` | `npm run build` |

---

## Section 4. Implementation Code Examples (Mẫu Code Triển khai)

### Order 1, 2, 3: Queue Layer Teardown
- **Target Files**: `src/modules/queue/enums/queue-name.enum.ts`, `src/modules/queue/services/queue.service.ts`, `src/modules/queue/queue.module.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Gỡ bỏ đăng ký hàng đợi `search-job`.

```typescript
// In src/modules/queue/enums/queue-name.enum.ts:
// [TARGET SEAM]
export enum QUEUE_NAME {
    SCRAPING_JOB = 'scraping-job',
}

// In src/modules/queue/queue.module.ts:
// [TARGET SEAM]
@Global()
@Module({
    imports: [
        forwardRef(() => SharedModule),
        BullModule.registerQueue({
            name: QUEUE_NAME.SCRAPING_JOB,
        }),
    ],
    controllers: [QueueController],
    providers: [QueueService],
    exports: [QueueService],
})
export class QueueModule {}

// In src/modules/queue/services/queue.service.ts:
// [TARGET SEAM]
constructor(
    @InjectQueue(QUEUE_NAME.SCRAPING_JOB) private readonly scrapingJobQueue: Queue<IScrapingJobQueueInterface>,
) {
    this.registerQueue(QUEUE_NAME.SCRAPING_JOB, this.scrapingJobQueue);
}
```

### Order 6, 7: Schedule Layer Teardown
- **Target Files**: `src/modules/schedule/enums/schedule-execution.enum.ts`, `src/modules/schedule/schedule.module.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Loại bỏ `SearchScheduleService` và enum `ExecutionServiceEnum.SEARCH`.

```typescript
// In src/modules/schedule/enums/schedule-execution.enum.ts:
// [TARGET SEAM]
export enum ExecutionServiceEnum {
    DATA_PROVIDER = 'data_provider',
}

// In src/modules/schedule/schedule.module.ts:
// [TARGET SEAM]
const executionServices = [DataProviderScheduleService];
// ...
{
    provide: SCHEDULE_EXECUTION_SERVICE_MAP,
    useFactory: (
        dataProviderScheduleService: DataProviderScheduleService,
    ): Record<string, IScheduleExecutionInterface> => ({
        [ExecutionServiceEnum.DATA_PROVIDER]: dataProviderScheduleService,
    }),
    inject: [DataProviderScheduleService],
}
```

### Order 10: Worker Layer Teardown
- **Target File**: `src/modules/worker/worker.module.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Loại bỏ `SearchWorkerProcessor` khỏi danh sách processors.

```typescript
// In src/modules/worker/worker.module.ts:
// [TARGET SEAM]
import { ScrapingWorkerProcessor } from './processors/scraping-worker.processor';

const processors = [ScrapingWorkerProcessor];
```

### Order 13: Feature Runner Registry Teardown
- **Target File**: `src/modules/data-provider/runners/feature-runner.registry.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Chỉ duy trì `ScrapingFeatureRunner`.

```typescript
// In src/modules/data-provider/runners/feature-runner.registry.ts:
// [TARGET SEAM]
@Injectable()
export class FeatureRunnerRegistry {
    private readonly runnerMap: Map<DataProviderFeatureType, IFeatureRunner>;

    constructor(scrapingRunner: ScrapingFeatureRunner) {
        this.runnerMap = new Map<DataProviderFeatureType, IFeatureRunner>([
            [DataProviderFeatureType.SCRAPING, scrapingRunner],
        ]);
    }

    getRunner(type: DataProviderFeatureType): IFeatureRunner {
        const runner = this.runnerMap.get(type);
        if (!runner) {
            throw new BadRequestException(`No feature runner registered for type: ${type}`);
        }
        return runner;
    }
}
```

### Order 26: DataProviderModule Cleanup
- **Target File**: `src/modules/data-provider/data-provider.module.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Gỡ bỏ hoàn toàn controllers, providers và factory map của search.

```typescript
// [TARGET SEAM]
// Remove DataProviderSearchController from controllers
// Remove DataProviderSearchService, GenericDataProviderSearchService, SearchFeatureRunner from services
// Remove DATA_PROVIDER_SEARCH_SERVICE_MAP provider from providers
```

---

## Section 5. Test Cases (Kịch bản Kiểm thử & Nghiệm thu)

### TC-01: Full Repository Compilation & Type Check
- **Objective**: Đảm bảo toàn bộ ứng dụng compile TypeScript 100% không còn tham chiếu tới bất kỳ search service, controller hay queue nào.
- **Action**: Chạy `npm run build`.
- **Expected Result**: Exit code 0, không có lỗi type checking.

### TC-02: Scraping Queue & Schedule Regression Verification
- **Objective**: Đảm bảo luồng `ScrapingWorkerProcessor`, `QueueService` và `DataProviderScheduleService` tiếp tục hoạt động hoàn hảo.
- **Action**: Chạy `npm run build` và kiểm tra TypeORM & Bull queue initialization.
- **Expected Result**: Queue module khởi tạo thành công chỉ với `scraping-job`.

### TC-03: Discovery Engine Functionality Verification
- **Objective**: Đảm bảo luồng Discovery (`DiscoverySessionService`, `DiscoveryUrlService`, `DiscoveryRunnerService`, `DiscoveryValidationService`) độc lập và hoàn toàn ổn định.
- **Action**: Chạy `npm run build` & verify code paths.
- **Expected Result**: Tất cả discovery components hoạt động đúng contract.

### TC-04: Full Linter Compliance
- **Objective**: Xác nhận toàn bộ codebase tuân thủ 100% quy tắc Prettier và ESLint.
- **Action**: Chạy `$env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint "src/**/*.ts"`.
- **Expected Result**: Exit code 0 (0 errors, 0 warnings).

---

## Section 6. Technical English Key Patterns

### 1. Unified Engine Consolidation
- **Meaning (VI)**: Hợp nhất các chuỗi xử lý phụ vào một engine cốt lõi, xóa bỏ hoàn toàn các hàng đợi và worker dư thừa.
- **Grammar / Usage**: `consolidate [fragmented subsystems] into a unified engine, deprecating [associated workers and queues].`
- **Engineering Example**: *"We consolidated all resource discovery into the unified Discovery Engine, deprecating legacy search workers and queues."*

### 2. Strategy Registry Pruning
- **Meaning (VI)**: Thu gọn danh sách chiến lược đăng ký trong Registry khi một tính năng được tách ra khỏi mô hình runner thông thường.
- **Grammar / Usage**: `prune [retired strategy runner] from the [FeatureRunnerRegistry].`
- **Engineering Example**: *"Pruning `SearchFeatureRunner` from the registry leaves only active, supported capabilities."*

### 3. Queue Architecture Simplification
- **Meaning (VI)**: Tinh giản kiến trúc hàng đợi bằng cách loại bỏ các channel/queue không còn phục vụ giá trị nghiệp vụ.
- **Grammar / Usage**: `streamline queue topology by eliminating [redundant queue name] from BullModule bindings.`
- **Engineering Example**: *"Eliminating `SEARCH_JOB` streamlined our queue topology and reduced Redis worker memory footprint."*
