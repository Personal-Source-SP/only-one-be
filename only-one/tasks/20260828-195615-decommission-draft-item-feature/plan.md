---
status: done
slug: decommission-draft-item-feature
started_at: 2026-08-28
completed_at: 2026-08-28
pr_url: ~
branch: ~
---

# Plan: Decommission & Remove Legacy DraftItem Feature

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

### 1.1 Phân tích Hiện trạng & Luồng thực thi cũ
Trước khi hệ thống phát triển bộ tính năng **Discovery & Validation Engine** (`DiscoverySession`, `DiscoveryUrl`, `DiscoveryValidationBatch`, `DiscoveryValidationLog`), hệ thống sử dụng cơ chế `DraftItem` làm nơi lưu trữ tạm các kết quả tìm kiếm/cào dữ liệu thô:
- [draft-item.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/draft-item.entity.ts): Entity đại diện cho bảng `draft_items`, liên kết `ManyToOne` với `DataProviderFeatureEntity` và `ItemEntity` (cho cả `suggestedItem` và `mappedItem`).
- [item.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/item.entity.ts#L37-L44): Chứa 2 quan hệ `OneToMany` ngược chiều (`suggestedDraftItems`, `mappedDraftItems`) dẫn tới `DraftItemEntity`.
- [data-provider-feature.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts#L62-L65): Chứa quan hệ `OneToMany` (`draftItems`) tới `DraftItemEntity`.
- [draft-item.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/draft-item.service.ts): Đảm nhiệm việc lưu draft (`saveDiscoveredProducts`), map draft sang catalog `ItemEntity` (`mapDraftItem`), và thực thi batch search (`processSearchData`).
- [draft-item.controller.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/draft-item.controller.ts): Cung cấp CRUD và 2 endpoints `POST /draft-items/process-search-data` và `POST /draft-items/:id/map`.
- [search-worker.processor.ts](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/search-worker.processor.ts#L9-L43): Bull queue processor phụ thuộc trực tiếp vào `DraftItemService.processSearchData`.
- [1765400000000-CreateDraftItemsTable.ts](file:///d:/Sources/Personal/only-one-be/src/migrations/1765400000000-CreateDraftItemsTable.ts): Migration tạo bảng `draft_items` và các index liên quan.

### 1.2 Vấn đề Kỹ thuật Cần giải quyết
- **Redundant Architecture**: Tính năng Discovery Engine đã bao phủ toàn diện từ crawl URL, đánh giá confidence, phân loại match result, audit log tới batch enqueue sang `ScrapingData`. `DraftItem` hoàn toàn là dead code và gây phân mảnh domain model.
- **Database Overhead**: Bảng `draft_items` với 3 index và nhiều foreign key constraints gây lãng phí tài nguyên và rủi ro cascading lock không cần thiết.
- **Blast Radius**: `SearchWorkerProcessor` và `DataProviderModule` đang bị dính chặt (tightly coupled) vào `DraftItemService`.

### 1.3 Danh sách Invariants (Hành vi bắt buộc giữ vững)
1. **Discovery Engine Intact**: Toàn bộ luồng `DiscoverySessionService`, `DiscoveryUrlService`, `DiscoveryValidationService`, `DiscoveryRunnerService` hoạt động ổn định 100%, không bị ảnh hưởng.
2. **DataProvider & Feature Intact**: `DataProviderEntity`, `DataProviderFeatureEntity`, `ItemEntity` hoạt động bình thường, không suy thoái các quan hệ khác (`dataProviderItems`, `scrapingData`, `versions`).
3. **Queue Search Worker Resilience**: `SearchWorkerProcessor` chuyển sang gọi `DataProviderSearchService` để thực thi tìm kiếm độc lập mà không tạo hay phụ thuộc vào `draft_items`.

---

## Section 2. Detailed Design (Thiết kế Kỹ thuật Chi tiết)

### 2.1 Kiến trúc Tháo dỡ & Tách rời Phụ thuộc (Teardown Architecture)
Chúng ta áp dụng nguyên lý **Clean Break & Zero Dead-Code**:
1. **Database Layer**: Tạo migration `1765500000000-DropDraftItemsTable.ts` để drop bảng `draft_items` và tất cả index liên quan.
2. **Entity Layer**: 
   - Xóa file `draft-item.entity.ts`.
   - Loại bỏ các field `suggestedDraftItems`, `mappedDraftItems` trong `ItemEntity`.
   - Loại bỏ field `draftItems` trong `DataProviderFeatureEntity`.
3. **Service & Controller Layer**:
   - Xóa bỏ `DraftItemController`, `DraftItemService`, `DraftItemDto`, `draft-item-request.dto.ts`, `draft-item-pagination.config.ts`, `draft-item-status.enum.ts`, `map-draft-item-action.enum.ts`.
   - Di chuyển và tái cấu trúc phương thức `processSearchData` sang `DataProviderSearchService` (để `SearchWorkerProcessor` và `SearchScheduleService` tiếp tục thực thi việc tìm kiếm đa provider mà không cần tạo draft items).
4. **Module & Mapping Layer**:
   - Cập nhật `DataProviderModule`: Bỏ `DraftItemEntity`, `DraftItemController`, `DraftItemService`.
   - Cập nhật `DataProviderProfile`: Bỏ mapping giữa `DraftItemEntity` và `DraftItemDto`.
   - Cập nhật các file barrel export (`enums/index.ts`, `dtos/requests/index.ts`).

```
       [ BEFORE TEARDOWN ]                                    [ AFTER TEARDOWN ]
+--------------------------------+                    +--------------------------------+
|     SearchWorkerProcessor      |                    |     SearchWorkerProcessor      |
+--------------------------------+                    +--------------------------------+
               |                                                      |
               v                                                      v
+--------------------------------+                    +--------------------------------+
|       DraftItemService         |                    |   DataProviderSearchService    |
|   (creates DraftItemEntity)    |                    |    (pure provider search)      |
+--------------------------------+                    +--------------------------------+
        |                |                                            |
        v                v                                            v
+---------------+ +--------------+                    +--------------------------------+
|  draft_items  | | ItemEntity   |                    |   Discovery Session Engine     |
|    (table)    | | (relations)  |                    | (DiscoverySession, Url, Batch) |
+---------------+ +--------------+                    +--------------------------------+
     [DELETED]
```

### 2.2 Red-Team Adversarial Assessment (`doubt-driven-development`)
- **CLAIM**: Xóa `DraftItemService` sẽ làm hỏng `SearchWorkerProcessor` khi xử lý job `QUEUE_NAME.SEARCH_JOB`.
- **DOUBT**: `SearchWorkerProcessor` cần một service điều phối việc lặp qua danh sách data providers và gọi search API. Nếu xóa `DraftItemService` mà không chuyển giao hàm điều phối tìm kiếm thì build sẽ gãy và job queue bị lỗi.
- **RECONCILE**: Chuyển giao logic điều phối `processSearchData` vào đúng bounded context của nó là `DataProviderSearchService`, loại bỏ phần chèn bảng `draft_items`. Cập nhật `SearchWorkerProcessor` inject `DataProviderSearchService`.

---

## Section 3. Implementation Architecture & Machine-Readable Task Matrix

### 3.1 Machine-Readable Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/migrations/1765500000000-DropDraftItemsTable.ts` | `DropDraftItemsTable1765500000000` | `None` | `npm test` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/entities/item.entity.ts` | `ItemEntity.suggestedDraftItems`, `ItemEntity.mappedDraftItems` | `None` | `npm test` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/entities/data-provider-feature.entity.ts` | `DataProviderFeatureEntity.draftItems` | `None` | `npm test` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-search.service.ts` | `DataProviderSearchService.processSearchData`, `DataProviderSearchService.getDataProvidersForSearch` | `None` | `npm test` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/responses/process-search-data-response.dto.ts` | `ProcessSearchDataResponse.totalItemsFound` | `None` | `npm test` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/worker/processors/search-worker.processor.ts` | `SearchWorkerProcessor.constructor`, `SearchWorkerProcessor.process` | `Order 4` | `npm test src/modules/worker/_tests/search-worker.processor.spec.ts` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/worker/_tests/search-worker.processor.spec.ts` | `SearchWorkerProcessor Test Suite` | `Order 6` | `npm test src/modules/worker/_tests/search-worker.processor.spec.ts` |
| **8** | `[x]` | `[DELETE]` | `src/modules/data-provider/entities/draft-item.entity.ts` | `DraftItemEntity` | `Order 2, 3` | `npm run build` |
| **9** | `[x]` | `[DELETE]` | `src/modules/data-provider/controllers/draft-item.controller.ts` | `DraftItemController` | `None` | `npm run build` |
| **10** | `[x]` | `[DELETE]` | `src/modules/data-provider/services/draft-item.service.ts` | `DraftItemService` | `Order 4, 6` | `npm run build` |
| **11** | `[x]` | `[DELETE]` | `src/modules/data-provider/dtos/draft-item.dto.ts` | `DraftItemDto` | `None` | `npm run build` |
| **12** | `[x]` | `[DELETE]` | `src/modules/data-provider/dtos/requests/draft-item-request.dto.ts` | `MapDraftItemRequestDto`, `FilterDraftItemPaginationDto` | `None` | `npm run build` |
| **13** | `[x]` | `[DELETE]` | `src/modules/data-provider/constants/draft-item-pagination.config.ts` | `DRAFT_ITEM_PAGINATION_CONFIG` | `None` | `npm run build` |
| **14** | `[x]` | `[DELETE]` | `src/modules/data-provider/enums/draft-item-status.enum.ts` | `DraftItemStatus` | `None` | `npm run build` |
| **15** | `[x]` | `[DELETE]` | `src/modules/data-provider/enums/map-draft-item-action.enum.ts` | `MapDraftItemAction` | `None` | `npm run build` |
| **16** | `[x]` | `[DELETE]` | `src/modules/data-provider/_tests/draft-item.service.spec.ts` | `DraftItemService Test Suite` | `Order 10` | `npm test` |
| **17** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.profile.ts` | `DataProviderProfile.profile` | `Order 8, 11` | `npm run build` |
| **18** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | `DataProviderModule` (imports, controllers, providers, exports) | `Order 8, 9, 10` | `npm run build` |
| **19** | `[x]` | `[MODIFY]` | `src/modules/data-provider/enums/index.ts` | Barrel exports | `Order 14, 15` | `npm run build` |
| **20** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/requests/index.ts` | Barrel exports | `Order 12` | `npm run build` |

---

## Section 4. Implementation Code Examples (Mẫu Code Triển khai)

### Order 1: Migration Drop Draft Items Table
- **Target File**: `src/migrations/1765500000000-DropDraftItemsTable.ts`
- **Action**: `[NEW]`
- **Rationale**: Xóa bảng `draft_items` và các indexes trên cơ sở dữ liệu.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

// [TARGET SEAM] TypeORM Migration for dropping draft_items table
export class DropDraftItemsTable1765500000000 implements MigrationInterface {
    name = 'DropDraftItemsTable1765500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // [RATIONALE] Drop indexes before table to ensure clean teardown
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_draft_items_code"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_draft_items_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_draft_items_feature_url"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "draft_items"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // [RATIONALE] Recreate schema in case of rollback
        await queryRunner.query(`
            CREATE TABLE "draft_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "data_provider_feature_id" uuid NOT NULL,
                "title" text NOT NULL,
                "url" text NOT NULL,
                "code" character varying(100),
                "search_query" character varying(255),
                "confidence" double precision NOT NULL DEFAULT 0,
                "status" character varying(50) NOT NULL DEFAULT 'NEW',
                "suggested_item_id" uuid,
                "mapped_item_id" uuid,
                "mapped_data_provider_item_id" uuid,
                "metadata" jsonb,
                CONSTRAINT "PK_draft_items_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_draft_items_data_provider_feature" FOREIGN KEY ("data_provider_feature_id") REFERENCES "data_provider_features"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_draft_items_suggested_item" FOREIGN KEY ("suggested_item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_draft_items_mapped_item" FOREIGN KEY ("mapped_item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE NO ACTION
            );
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_draft_items_feature_url" ON "draft_items" ("data_provider_feature_id", "url");
            CREATE INDEX "IDX_draft_items_status" ON "draft_items" ("status");
            CREATE INDEX "IDX_draft_items_code" ON "draft_items" ("code");
        `);
    }
}
```

### Order 2 & 3: Clean Entity Relations
- **Target Files**: `src/modules/data-provider/entities/item.entity.ts`, `src/modules/data-provider/entities/data-provider-feature.entity.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Gỡ bỏ import `DraftItemEntity` và các trường OneToMany không còn tồn tại.

```typescript
// In src/modules/data-provider/entities/item.entity.ts:
// [TARGET SEAM] Remove suggestedDraftItems and mappedDraftItems properties & DraftItemEntity import

// In src/modules/data-provider/entities/data-provider-feature.entity.ts:
// [TARGET SEAM] Remove draftItems property & DraftItemEntity import
```

### Order 4 & 5: Transfer Search Processing to DataProviderSearchService
- **Target Files**: `src/modules/data-provider/services/data-provider-search.service.ts`, `src/modules/data-provider/dtos/responses/process-search-data-response.dto.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Giữ vững chức năng batch search đa provider trong `DataProviderSearchService` mà không lưu bảng `draft_items`.

```typescript
// In src/modules/data-provider/services/data-provider-search.service.ts:
// [TARGET SEAM] Add processSearchData coordinator method
async processSearchData(request: ProcessSearchDataRequestDto): Promise<ProcessSearchDataResponse> {
    const providers = await this.getDataProvidersForSearch(request.dataProviderIds);
    if (!providers.length) {
        return new ProcessSearchDataResponse({
            process: 0,
            success: 0,
            error: 0,
            errorsMessage: 'No data providers available with active SEARCH feature',
            totalItemsFound: 0,
        });
    }

    const response = new ProcessSearchDataResponse({
        process: providers.length,
        success: 0,
        error: 0,
        errors: [],
        totalItemsFound: 0,
    });

    for (const dataProvider of providers) {
        const searchFeature = dataProvider.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
        if (!searchFeature) continue;

        const queries = request.searchQueries?.length ? request.searchQueries : [''];
        const barcodes = request.barcodes?.length ? request.barcodes : [undefined];

        for (const query of queries) {
            for (const barcode of barcodes) {
                try {
                    const searchRes = await this.searchItems({
                        dataProviderId: dataProvider.id,
                        searchQuery: query,
                        barcode,
                    });

                    if (searchRes.status === 'success' && searchRes.discoveredItems?.length) {
                        response.totalItemsFound += searchRes.discoveredItems.length;
                        response.success++;
                        await this.dataProviderFeatureService.recordFeatureSuccess(searchFeature.id);
                    } else if (searchRes.status === 'error' || searchRes.error) {
                        response.error++;
                        const errorMsg = searchRes.error || 'Failed to search items';
                        response.errors.push({
                            dataProviderName: dataProvider.name,
                            errorMessage: errorMsg,
                            searchQuery: query,
                        });
                        await this.dataProviderFeatureService.recordFeatureFailure(
                            searchFeature.id,
                            errorMsg,
                            DataProviderFeatureErrorType.TRANSIENT,
                        );
                    } else {
                        response.success++;
                        await this.dataProviderFeatureService.recordFeatureSuccess(searchFeature.id);
                    }
                } catch (err) {
                    response.error++;
                    const errorMsg = err?.message || 'Unknown error';
                    response.errors.push({
                        dataProviderName: dataProvider.name,
                        errorMessage: errorMsg,
                        searchQuery: query,
                    });
                    await this.dataProviderFeatureService.recordFeatureFailure(
                        searchFeature.id,
                        errorMsg,
                        DataProviderFeatureErrorType.TRANSIENT,
                    );
                }
            }
        }
    }

    return response;
}
```

### Order 6: Update SearchWorkerProcessor
- **Target File**: `src/modules/worker/processors/search-worker.processor.ts`
- **Action**: `[MODIFY]`
- **Rationale**: Thay thế `DraftItemService` bằng `DataProviderSearchService`.

```typescript
// [TARGET SEAM] Constructor and Process logic in SearchWorkerProcessor
constructor(
    private readonly dataProviderSearchService: DataProviderSearchService,
    private readonly scheduleJobEventService: ScheduleJobEventService,
) {
    this.workerProcessName = (global as any).WORKER_PROCESS_NAME || 'UnknownWorker';
    this.loggerService.log('SearchWorkerProcessor Initialized');
}

@Process()
async process(job: SearchWorkerProcessorType): Promise<ProcessSearchDataResponse> {
    this.loggerService.log(`Starting search job ${job.id}, attempts: ${job.attemptsMade}`);

    if (!job.attemptsMade) {
        await this.updateScheduleJobEvent(job, ScheduleJobEventType.PROCESSING);
    }

    try {
        const data = job.data.request;
        const searchData = await this.dataProviderSearchService.processSearchData(data);

        if (!searchData) {
            throw new CustomError(SEARCH_WORKER_MESSAGE.FAILED_TO_PROCESS_SEARCH_DATA);
        }

        return searchData;
    } catch (error) {
        throw new CustomError(error?.message, error?.data);
    }
}
```

---

## Section 5. Test Cases (Kịch bản Kiểm thử & Nghiệm thu)

### TC-01: Full Repository Compilation & Type Check
- **Objective**: Xác nhận toàn bộ repository không còn bất kỳ lỗi import, type checking hay dangling reference nào sau khi xóa `DraftItem`.
- **Action**: Chạy `npm run build`.
- **Expected Result**: Exit code 0, không có lỗi TypeScript compilation.

### TC-02: Search Worker Processor Execution Test
- **Objective**: Xác thực `SearchWorkerProcessor` thực thi suôn sẻ với `DataProviderSearchService` đã được decoupled.
- **Precondition**: Mock `DataProviderSearchService.processSearchData` trả về `ProcessSearchDataResponse`.
- **Action**: Chạy `npm test src/modules/worker/_tests/search-worker.processor.spec.ts`.
- **Expected Result**: 100% tests pass.

### TC-03: Discovery Engine Regression Tests
- **Objective**: Đảm bảo toàn bộ luồng Discovery Session, Discovery Url và Validation không bị suy thoái.
- **Action**: Chạy `npm test src/modules/data-provider/_tests/discovery-session.service.spec.ts` & `src/modules/data-provider/_tests/discovery-url.service.spec.ts`.
- **Expected Result**: 100% discovery tests pass.

### TC-04: Full Unit Test Suite Verification
- **Objective**: Chạy toàn bộ test suites của project.
- **Action**: Chạy `npm test`.
- **Expected Result**: Toàn bộ unit tests trong toàn bộ dự án vượt qua 100%.

---

## Section 6. Technical English Key Patterns

### 1. Decouple & Teardown Pattern
- **Meaning (VI)**: Tách rời phụ thuộc và tháo dỡ các thành phần lỗi thời theo thứ tự an toàn.
- **Grammar / Usage**: `decouple [dependent module] from [legacy component] prior to executing the teardown.`
- **Engineering Example**: *"We decoupled `SearchWorkerProcessor` from `DraftItemService` before completing the teardown of the draft items module."*

### 2. Invariant Preservation Pattern
- **Meaning (VI)**: Bảo đảm các ràng buộc và hành vi cốt lõi của hệ thống không bị suy thoái trong quá trình refactoring.
- **Grammar / Usage**: `preserve critical system invariants throughout the migration / refactoring lifecycle.`
- **Engineering Example**: *"By preserving domain invariants, we ensured that the Discovery Engine remained completely unaffected by this deletion."*

### 3. Clean Break Strategy
- **Meaning (VI)**: Chiến lược cắt đứt hoàn toàn phiên bản cũ, xóa triệt để dead code mà không giữ lại boilerplate tương thích ngược.
- **Grammar / Usage**: `execute a clean break to eliminate maintenance overhead and schema drift.`
- **Engineering Example**: *"Adopting a clean break strategy allowed us to purge dead tables and keep our ORM entities lean."*
