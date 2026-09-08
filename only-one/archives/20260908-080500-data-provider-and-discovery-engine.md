---
id: 20260908-080500-data-provider-and-discovery-engine
title: Flat Data Provider, Pluggable Feature Runners, Config Versioning, Async Discovery & Search Extraction Engine
archived_at: 2026-09-08
status: active
references:
  - only-one/archives/20260907-214608-standardized-custom-decorators-suite.md
  - only-one/archives/20260907-214608-common-exception-handling.md
affected_modules:
  - modules/data-provider
  - modules/worker
  - modules/queue
---

# Archive: Flat Data Provider, Pluggable Feature Runners, Config Versioning, Async Discovery & Search Extraction Engine

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**:
  - Trước đây, `DataProviderEntity` bị phụ thuộc phân cấp cha-con (`parentId`), cấu hình nhồi nhét vào bảng `data_providers`, controller bị gánh đa nhiệm vụ (god controller), và pipeline validation/ingestion đồng bộ làm nghẽn API thread khi xử lý khối lượng lớn URLs phát hiện.
  - Cơ chế tìm kiếm (`SEARCH` feature) từng bị phụ thuộc vào scraping helper (`ExtractDataHelper`) và DTO scraping (`ScrapeItemDataResponseItemDto`), gây lỗi runtime khi chạy script `searchData(html)` và sai lệch schema kết quả sản phẩm. Đồng thời URL search builder bị gán cứng fallback `?q=`, và HTML thô chứa header/footer/sidebar rác chưa được lọc trước khi nạp vào script trích xuất.
- **Giá trị (Value)**:
  1. **Flat & Pluggable Architecture**: `DataProvider` được thiết kế phẳng, độc lập. Các năng lực (`SCRAPING`, `SEARCH`, `DISCOVERY`) được trừu tượng hóa qua `IFeatureRunner` (`ScrapingFeatureRunner`, `SearchFeatureRunner`, `DiscoveryRunner`) và đăng ký tập trung vào `FeatureRunnerRegistry`.
  2. **Isolated Config Versioning & Rollback**: `ConfigVersionEntity` gắn trực tiếp theo `featureId`. Toàn bộ endpoints xem lịch sử và rollback phiên bản được tách riêng thành [ConfigVersionController](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/config-version.controller.ts) chuẩn Single Responsibility Principle (SRP).
  3. **Stateless Feature Sandbox**: Chuẩn hóa việc kiểm thử cấu hình không trạng thái qua endpoint duy nhất `POST /data-provider-features/test`.
  4. **Asynchronous Discovery Engine**: Xây dựng pipeline thu thập URLs với traversal linh hoạt, xử lý batch validation bất đồng bộ qua Bull queue worker (`QUEUE_NAME.DISCOVERY_VALIDATION_JOB`) với heuristic scoring và nạp dữ liệu chuẩn hóa (Item Ingestion) bất đồng bộ qua worker (`QUEUE_NAME.DISCOVERY_INGESTION_JOB`) theo đối soát phân tầng (`code` -> `name` fallback) có tính bất biến lặp (idempotency).
  5. **Dedicated Search Extraction & HTML Preprocessing Engine**: Tách biệt hoàn toàn `ExtractSearchDataHelper` và `SearchResultItemDto` (`url`, `title`, `imageUrl`, `relativeUrl`, `metadata`), hỗ trợ cả `searchData` và fallback `extractData`. Tích hợp lọc DOM theo `mainContentSelector` / `isGetParentElement` và chuẩn hóa placeholder URL `{...}` linh hoạt.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Flat Entity & Isolated Feature Versioning**:
  - `DataProviderEntity` độc lập, không kế thừa cha-con.
  - `DataProviderFeatureEntity` quản lý `type: DataProviderFeatureType`, `service: ScraperServiceEnum`, `status: DataProviderFeatureStatus`, và polymorphic `config: jsonb`.
  - `ConfigVersionEntity` gắn với `featureId`, cho phép rollback snapshot và theo dõi lịch sử chỉnh sửa nguyên tử.
- **Dedicated Sub-Resource Controllers**:
  - `DataProviderFeatureController`: Chuyên trách CRUD feature, switch status và trigger stateless test sandbox.
  - `ConfigVersionController`: Chuyên trách lấy danh sách phiên bản, rollback phiên bản và xóa phiên bản cũ không hoạt động (base route `@Controller('data-provider-features')`).
- **Asynchronous Worker Pipelines (Thin Delegator Pattern)**:
  - **Validation Pipeline**: `DiscoveryValidationService.startBatchValidation` tạo batch và đẩy jobs vào Bull Queue `QUEUE_NAME.DISCOVERY_VALIDATION_JOB`. Worker `DiscoveryValidationWorkerProcessor` ủy quyền cho `DiscoveryValidationService.validateUrlForBatch()` thực thi `DiscoveryValidationHelper.evaluateUrl()`.
  - **Ingestion Pipeline**: `DiscoveryUrlService.batchIngest` đẩy jobs vào Bull Queue `QUEUE_NAME.DISCOVERY_INGESTION_JOB`. Worker `DiscoveryIngestionWorkerProcessor` ủy quyền cho `DiscoveryUrlService.ingestDiscoveredUrl()`, đối soát phân tầng (SKU/Code $\rightarrow$ Name $\rightarrow$ Tạo mới `ItemEntity`), liên kết `DataProviderItemEntity` và chuyển `DiscoveryUrlEntity.status = INGESTED`.
- **Search Extraction Pipeline & DOM Scoping**:
  - `ExtractSearchDataHelper`: Thực thi hàm JavaScript an toàn với `cheerio` và `axios`, bóc tách HTML sau khi tiền xử lý qua `transformHtmlContent` (xóa thẻ `<style>`, `<link>`) và `getMainContent` (lọc theo `mainContentSelector` hoặc parent element).
  - `SearchFeatureRunner.buildSearchUrl`: Khớp và thay thế chính xác `{...}` placeholders (e.g. `{query}`, `{keyword}`), tự động nối placeholder vào đường dẫn URL nếu pattern chưa chứa placeholder, loại bỏ hoàn toàn fallback `?q=` cứng.

```mermaid
flowchart TD
    DataProvider[DataProviderEntity (Flat & Independent)] -->|1 : N| Features[DataProviderFeatureEntity]
    Features -->|1 : N| ConfigVersion[ConfigVersionEntity (featureId scoped)]
    
    subgraph Controllers
        DPFC[DataProviderFeatureController]
        CVC[ConfigVersionController]
    end
    
    DPFC -->|Feature Lifecycle| Features
    CVC -->|History & Rollback| ConfigVersion
    
    Features -->|Runners Strategy| Registry[FeatureRunnerRegistry]
    Registry --> ScrapingRunner[ScrapingFeatureRunner]
    Registry --> SearchRunner[SearchFeatureRunner]
    Registry --> DiscRunner[DiscoveryRunner]
    
    SearchRunner --> SearchHelper[ExtractSearchDataHelper]
    SearchHelper --> HTMLTransform[transformHtmlContent & getMainContent]
    SearchHelper --> SearchDTO[SearchResultItemDto]
    
    DiscRunner -->|Session Crawl| Session[DiscoverySessionEntity]
    Session -->|Discovered URLs| Urls[(DiscoveryUrlEntity)]
    
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
- [data-provider.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider.entity.ts): Entity phẳng nhà cung cấp dữ liệu.
- [data-provider-feature.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts): Entity tính năng mở rộng.
- [config-version.entity.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/config-version.entity.ts): Snapshot phiên bản cấu hình theo feature.
- [data-provider-feature.controller.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts): Controller quản lý vòng đời tính năng và test sandbox.
- [config-version.controller.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/config-version.controller.ts): Controller quản lý lịch sử và rollback phiên bản.
- [search-extract-data-response.dto.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts): DTO chuẩn hóa kết quả tìm kiếm (`SearchResultItemDto`, `SearchExtractDataResponseDto`).
- [extract-search-data.helper.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/extract-search-data.helper.ts): Helper trích xuất tìm kiếm, lọc `mainContentSelector` và DOM cleaning.
- [search-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts): Runner tìm kiếm dữ liệu và bộ dựng URL placeholder linh hoạt.
- [generic-data-provider-search.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts): Service tìm kiếm generic truyền tham số scoping.
- [scraping-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/scraping-feature.runner.ts): Runner bóc tách dữ liệu chi tiết.
- [discovery.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/discovery.runner.ts): Runner khám phá URL.
- [discovery-validation.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/discovery-validation.service.ts): Service kiểm định batch URL.
- [discovery-url.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/discovery-url.service.ts): Service quản lý URL khám phá và nạp dữ liệu.
- [discovery-validation-worker.processor.ts](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/discovery-validation-worker.processor.ts): Worker xử lý kiểm định URL bất đồng bộ.
- [discovery-ingestion-worker.processor.ts](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/discovery-ingestion-worker.processor.ts): Worker xử lý nạp dữ liệu vào catalog bất đồng bộ.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **TypeScript Compilation**: `npm run build` $\rightarrow$ Exit Code 0.
- **ESLint & Prettier**: 100% Clean.
