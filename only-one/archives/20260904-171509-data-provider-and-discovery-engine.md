---
id: 20260904-171509-data-provider-and-discovery-engine
title: Flat Data Provider, Pluggable Features & Async Discovery Ingestion Engine
archived_at: 2026-09-04
status: active
references: []
affected_modules:
  - modules/data-provider
  - modules/worker
  - modules/queue
---

# Archive: Flat Data Provider, Pluggable Features & Async Discovery Ingestion Engine

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: Trước đây, `DataProviderEntity` bị phụ thuộc phân cấp cha-con (`parentId`), quan hệ vòng và cấu hình nhồi nhét trực tiếp vào bảng `data_providers`. Đồng thời, hệ thống sử dụng bảng trung gian `DraftItem` và pipeline validation/ingestion đồng bộ làm nghẽn API thread, gây timeout (HTTP 504) khi xử lý khối lượng lớn URLs phát hiện.
- **Giá trị (Value)**:
  1. **Flat & Pluggable Architecture**: Chuyển đổi `DataProvider` thành entity phẳng, tách các khả năng thành quan hệ 1-N `DataProviderFeatureEntity` với lifecycle độc lập, quản lý phiên bản snapshot cô lập (`ConfigVersionEntity`) và runner registry chuẩn hóa (`IFeatureRunner`, `FeatureRunnerRegistry`).
  2. **Asynchronous Discovery Engine**: Xây dựng pipeline thu thập URLs với traversal linh hoạt, xử lý batch validation bất đồng bộ qua Bull queue worker (`QUEUE_NAME.DISCOVERY_VALIDATION_JOB`) với heuristic scoring và nạp dữ liệu chuẩn hóa (Item Ingestion) bất đồng bộ qua worker (`QUEUE_NAME.DISCOVERY_INGESTION_JOB`) theo đối soát phân tầng (`code` -> `name` fallback) có tính bất biến lặp (idempotency).

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Flat Entity & Isolated Feature Versioning**:
  - `DataProviderEntity` độc lập, không kế thừa cha-con.
  - `DataProviderFeatureEntity` quản lý `type: DataProviderFeatureType`, `service: ScraperServiceEnum`, `status: DataProviderFeatureStatus`, và polymorphic `config: jsonb`.
  - `ConfigVersionEntity` gắn với `featureId`, cho phép rollback snapshot và theo dõi lịch sử chỉnh sửa nguyên tử.
- **Asynchronous Worker Pipelines (Thin Delegator Pattern)**:
  - **Validation Pipeline**: `DiscoveryValidationService.startBatchValidation` tạo batch và đẩy jobs vào Bull Queue `QUEUE_NAME.DISCOVERY_VALIDATION_JOB`. Worker `DiscoveryValidationWorkerProcessor` ủy quyền cho `DiscoveryValidationService.validateUrlForBatch()` thực thi `DiscoveryValidationHelper.evaluateUrl()`, quản lý transaction database cho `DiscoveryUrlEntity`, `DiscoveryValidationLogEntity`, và cập nhật tiến độ batch.
  - **Ingestion Pipeline**: `DiscoveryUrlService.batchIngest` đẩy jobs vào Bull Queue `QUEUE_NAME.DISCOVERY_INGESTION_JOB`. Worker `DiscoveryIngestionWorkerProcessor` ủy quyền cho `DiscoveryUrlService.ingestDiscoveredUrl()`, đối soát phân tầng (SKU/Code $\rightarrow$ Name $\rightarrow$ Tạo mới `ItemEntity`), liên kết `DataProviderItemEntity` và chuyển `DiscoveryUrlEntity.status = INGESTED`.
- **Strategy Testing Registry**: `IFeatureRunner` (`ScrapingFeatureRunner`, `DiscoveryRunner`) đăng ký qua `FeatureRunnerRegistry`, hỗ trợ kiểm thử không trạng thái (`POST /data-provider-features/test`) và kiểm thử ngữ cảnh (`POST /data-provider-features/:id/test`).
- **Complete Legacy Purge**: Tháo dỡ hoàn toàn `DraftItemEntity`, `draft-item.service.ts`, `data-provider-search.service.ts`, `search-schedule.service.ts`, `search-worker.processor.ts` và `PriceDetectorHelper`.

```mermaid
flowchart TD
    DataProvider[DataProviderEntity (Flat & Independent)] -->|1 : N| Features[DataProviderFeatureEntity]
    Features -->|1 : N| ConfigVersion[ConfigVersionEntity (featureId scoped)]
    
    Features -->|Session Trigger| Session[DiscoverySessionEntity]
    Session -->|Crawl| Runner[DiscoveryRunner]
    Runner -->|Discovered URLs| Urls[(DiscoveryUrlEntity)]
    
    Session -->|Batch Validation| BatchService[DiscoveryValidationService]
    BatchService -->|Producer| QueueVal[Bull Queue: DISCOVERY_VALIDATION_JOB]
    QueueVal --> WorkerVal[DiscoveryValidationWorkerProcessor]
    WorkerVal -->|Thin Delegator| BatchService
    BatchService --> Logs[(DiscoveryValidationLogEntity)]
    BatchService --> Batch[(DiscoveryValidationBatchEntity)]
    
    User[Batch Ingest Action] --> IngestService[DiscoveryUrlService.batchIngest]
    IngestService -->|Producer| QueueIngest[Bull Queue: DISCOVERY_INGESTION_JOB]
    QueueIngest --> WorkerIngest[DiscoveryIngestionWorkerProcessor]
    WorkerIngest -->|Thin Delegator| IngestService
    IngestService --> Resolution{Hierarchical Resolution: Code -> Name -> New}
    Resolution --> Item[(ItemEntity)]
    IngestService --> DPItem[(DataProviderItemEntity)]
    IngestService -->|Mark Ingested| Urls
```

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [`src/modules/data-provider/entities/data-provider.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/data-provider.entity.ts): Entity phẳng.
- [`src/modules/data-provider/entities/data-provider-feature.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts): Entity tính năng mở rộng.
- [`src/modules/data-provider/entities/config-version.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/config-version.entity.ts): Version snapshot entity.
- [`src/modules/data-provider/entities/discovery-session.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/discovery-session.entity.ts): Quản lý session.
- [`src/modules/data-provider/entities/discovery-url.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/discovery-url.entity.ts): Thực thể URL.
- [`src/modules/data-provider/entities/discovery-validation-batch.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/discovery-validation-batch.entity.ts): Batch validation entity.
- [`src/modules/data-provider/entities/discovery-validation-log.entity.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/discovery-validation-log.entity.ts): Validation log entity.
- [`src/modules/data-provider/services/discovery-validation.service.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-validation.service.ts): Validation service handler.
- [`src/modules/data-provider/services/discovery-url.service.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-url.service.ts): URLs và async ingestion service.
- [`src/modules/worker/processors/discovery-validation-worker.processor.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/worker/processors/discovery-validation-worker.processor.ts): Validation worker processor.
- [`src/modules/worker/processors/discovery-ingestion-worker.processor.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/worker/processors/discovery-ingestion-worker.processor.ts): Ingestion worker processor.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **TypeScript Compilation**: `npm run build` $\rightarrow$ Exit Code 0.
- **ESLint & Prettier**: 100% Clean.
