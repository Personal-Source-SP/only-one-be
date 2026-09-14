---
id: 20260914-210533-data-provider-and-discovery-engine
title: Kiến Trúc Nền Tảng Nhà Cung Cấp & Công Cụ Khám Phá URLs (Data Provider & Discovery Engine)
archived_at: 2026-09-14
status: active
references:
  - only-one/archives/20260910-221800-shared-fetcher-services-suite.md
  - only-one/archives/20260913-154500-audit-log-architecture.md
affected_modules:
  - data-provider
  - queue
  - worker
---

# Archive: Kiến Trúc Nền Tảng Nhà Cung Cấp & Công Cụ Khám Phá URLs (Data Provider & Discovery Engine)

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**:
  - Khám phá và trích xuất danh sách link sản phẩm tự động từ các nhà cung cấp dữ liệu (Data Providers) quy mô lớn.
  - Xử lý các bài toán mở rộng: nạp relation `dataProvider` khi phân trang (`getPagination`) và xem chi tiết (`getById`), validate query params enum đa hình, và tự động hóa chu trình phát hiện/chấm điểm URLs (`DiscoveryUrl`).
- **Giá trị (Value)**:
  - Cung cấp kiến trúc module tách rời: `DataProviderEntity` (thông tin định danh phẳng) $\leftrightarrow$ `DataProviderFeatureEntity` (tính năng đa hình: SEARCH, SCRAPING).
  - Tự động hóa quá trình tìm kiếm qua `SearchFeatureRunner`, lưu trữ URLs và chấm điểm mức độ khớp (`ValidationMatchResult`).
  - Chuẩn hóa pagination và relation mapping để client luôn nhận đầy đủ thông tin nhà cung cấp liên kết.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Mô hình Quan hệ (Data Model)**:
  - `DataProviderEntity`: Đại diện cho website/nguồn dữ liệu (`identifier`, `baseUrl`).
  - `DataProviderFeatureEntity`: Chứa cấu hình động `config: jsonb` và phiên bản cấu hình (`ConfigVersionEntity`).
  - `DiscoverySessionEntity`: Đại diện cho phiên khám phá (`sessionCode`, `targetUrl`, `status`, quan hệ `dataProvider`).
  - `DiscoveryUrlEntity`: Lưu trữ từng link phát hiện được kèm điểm số tin cậy (`confidenceScore`) và độ khớp (`matchResult`).
- **Cơ chế Phân trang & Nạp Quan hệ (Pagination & Eager Hydration)**:
  - `DISCOVERY_SESSION_PAGINATION_CONFIG`: Sử dụng `getRelationColumns(DiscoverySessionEntity, 'dataProvider', ['dataProviderId'])` trong mảng `select` để QueryBuilder luôn nạp các trường quan hệ của provider.
  - `DiscoverySessionService.findById`: Override mặc định với `{ relations: { dataProvider: true } }` đảm bảo tính sẵn sàng của dữ liệu khi client truy vấn thực thể đơn lẻ.
- **Hàng đợi & Worker Phân tán (Queue & Asynchronous Processing)**:
  - Tách luồng khám phá và đánh giá link sang Bull Queue (`QUEUE_NAME.DISCOVERY_SEARCH_JOB` và `QUEUE_NAME.DISCOVERY_VALIDATION_JOB`).
  - Đồng bộ tiến độ phiên tự động qua trigger cơ sở dữ liệu PostgreSQL.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [discovery-session.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/discovery-session.service.ts): Quản lý lifecycle phiên khám phá và override `findById`.
- [discovery-session-pagination.config.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/constants/discovery-session-pagination.config.ts): Cấu hình phân trang đầy đủ relation columns.
- [data-provider-feature.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts): Quản lý tính năng cào/tìm kiếm.
- [search-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts): Thực thi tìm kiếm động theo từ khóa.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Typecheck & Build**: `npx tsc --project tsconfig.build.json --noEmit` $\rightarrow$ `PASS (0 errors)`.
- **Trạng thái Codebase**: 100% khớp với mã nguồn hiện tại.
