---
id: 20260915-131744-data-provider-and-discovery-engine
title: Kiến Trúc Nền Tảng Nhà Cung Cấp & Công Cụ Khám Phá URLs (Data Provider & Discovery Engine)
archived_at: 2026-09-15
status: active
references:
  - only-one/archives/20260910-221800-shared-fetcher-services-suite.md
  - only-one/archives/20260913-154500-audit-log-architecture.md
affected_modules:
  - src/modules/data-provider
  - src/modules/queue
  - src/modules/worker
---

# Archive: Kiến Trúc Nền Tảng Nhà Cung Cấp & Công Cụ Khám Phá URLs (Data Provider & Discovery Engine)

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**:
  - Khám phá, trích xuất và lưu trữ danh sách link sản phẩm tự động từ các nhà cung cấp dữ liệu (Data Providers) quy mô lớn.
  - Trước đây: Feature runners bị phân mảnh qua class trung gian `FeatureRunnerRegistry` và đặt trong thư mục `runners/`, gây boilerplate và circular dependency tiềm ẩn.
  - Schema `DiscoveryUrlEntity` và `ItemEntity` có trường `code` bị nullable hoặc phải bóc tách thủ công runtime (`extractCodeFromUrl`), thiếu liên kết quan hệ 1-N trực tiếp giữa `ItemEntity` và `DiscoveryUrlEntity`, thiếu `metadata` linh hoạt.
- **Giá trị (Value)**:
  - Cung cấp kiến trúc module phân lớp rõ ràng: `DataProviderEntity` (định danh phẳng) $\leftrightarrow$ `DataProviderFeatureEntity` (tính năng đa hình: SEARCH, SCRAPING).
  - Chuẩn hóa phân giải feature services qua NestJS Custom Provider Factory Map (`DATA_PROVIDER_FEATURE_SERVICE_MAP`) và interface `IDataProviderFeatureService`, chuyển đổi toàn bộ runners thành domain services (`ScrapingFeatureService`, `SearchFeatureService`).
  - Chuẩn hóa schema với `ItemEntity.code` (unique, required), `DiscoveryUrlEntity.code` và quan hệ 1-N trực tiếp (`itemId` $\leftrightarrow$ `discoveryUrls`), bảo toàn `metadata` khi ingest URLs thành catalog items.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Mô hình Dữ liệu (Data Model)**:
  - `DataProviderEntity`: Đại diện cho website/nguồn dữ liệu (`identifier`, `baseUrl`).
  - `DataProviderFeatureEntity`: Chứa cấu hình động `config: jsonb` và phiên bản cấu hình (`ConfigVersionEntity`).
  - `DiscoverySessionEntity`: Đại diện cho phiên khám phá (`sessionCode`, `targetUrl`, `status`, quan hệ `dataProvider`).
  - `DiscoveryUrlEntity`: Lưu trữ từng link phát hiện được kèm `code`, `confidenceScore`, `matchResult`, `metadata: jsonb` và khóa ngoại `itemId` liên kết tới `ItemEntity`.
  - `ItemEntity`: Catalog item với `code` bắt buộc (unique), `metadata: jsonb`, và relation `@OneToMany(() => DiscoveryUrlEntity)`.
- **Cơ chế Phân giải Feature Services (DI Provider Factory Map)**:
  - Sử dụng token `DATA_PROVIDER_FEATURE_SERVICE_MAP` trong `DataProviderModule` cung cấp `Record<DataProviderFeatureType, IDataProviderFeatureService>`.
  - `DataProviderFeatureService` inject map trực tiếp, ủy quyền xử lý cấu hình (`validateConfig`), sandbox test (`testStateless`), và kiểm tra ngữ cảnh (`testContextual`) cho `ScrapingFeatureService` và `SearchFeatureService`.
- **Cơ chế Ingest URLs thành Catalog Items**:
  - `DiscoveryUrlService.ingestDiscoveredUrl` và `ingestDiscoveredUrlsChunk`: Tìm `ItemEntity` trực tiếp qua `urlEntity.code`. Nếu chưa có, tạo mới `ItemEntity` với `code`, `name` và copy `metadata`. Cập nhật `urlEntity.itemId` và đổi trạng thái sang `DiscoveryUrlStatus.INGESTED`.
- **Hàng đợi & Worker Phân tán (Queue & Asynchronous Processing)**:
  - Tách luồng tìm kiếm và đánh giá link sang Bull Queue (`QUEUE_NAME.DISCOVERY_SEARCH_JOB` và `QUEUE_NAME.DISCOVERY_VALIDATION_JOB`).
  - Đồng bộ tiến độ phiên tự động qua PostgreSQL trigger (`trg_sync_discovery_session_progress`).

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [data-provider-feature.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts): Service quản lý tính năng cào/tìm kiếm, inject map provider factory.
- [data-provider-feature-service.interface.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/interfaces/data-provider-feature-service.interface.ts): Interface chuẩn hóa cho feature services.
- [scraping-feature.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/data-provider-feature/scraping-feature.service.ts): Triển khai nghiệp vụ scraping feature.
- [search-feature.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/data-provider-feature/search-feature.service.ts): Triển khai nghiệp vụ search feature.
- [discovery-url.entity.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/discovery-url.entity.ts): Thực thể URL khám phá với `code`, `metadata`, `itemId`.
- [item.entity.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/entities/item.entity.ts): Thực thể sản phẩm chuẩn với `code` unique, `metadata`, quan hệ `discoveryUrls`.
- [discovery-url.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-url.service.ts): Xử lý ingest URLs đơn lẻ và theo chunk.
- [discovery-session.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-session.service.ts): Quản lý lifecycle phiên khám phá.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Typecheck & Build**: `npm run build` $\rightarrow$ `PASS (0 errors)`.
- **Unit Tests**: `npm run test` $\rightarrow$ `PASS (100% test suites passed)`.
- **Trạng thái Codebase**: 100% khớp với mã nguồn hiện tại.
