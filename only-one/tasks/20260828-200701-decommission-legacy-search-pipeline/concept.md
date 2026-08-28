# Concept: Decommission Legacy Search Pipeline & Consolidate into Discovery Engine

## 1. Problem Statement & Root Need (Bối cảnh & Vấn đề Cốt lõi)
- **Core Business Problem**: Trước đây, hệ thống duy trì song song hai cơ chế tìm kiếm/khám phá tài nguyên:
  1. **Legacy Search Pipeline**: Bao gồm `DataProviderSearchService`, `GenericDataProviderSearchService`, `DataProviderSearchController`, `SearchFeatureRunner`, `SearchScheduleService`, `SearchWorkerProcessor` và hàng đợi `QUEUE_NAME.SEARCH_JOB`. Pipeline này phân mảnh, cứng nhắc và trước đây chỉ phục vụ tạo ra các `draft_items` (đã bị xóa bỏ).
  2. **Modern Discovery Engine**: Bao gồm `DiscoverySession`, `DiscoveryUrl`, `DiscoveryRunnerService`, `DiscoveryValidationService`, `DiscoveryValidationBatch`, cung cấp khả năng crawl, trích xuất metadata, phân loại keyword, chấm điểm độ tin cậy và phê duyệt URL chuẩn mực hơn.
  Việc duy trì song song cơ chế Search cũ gây dư thừa mã nguồn (dead code), phân mảnh trách nhiệm điều phối job qua BullMQ, tăng chi phí bảo trì và gây nhập nhằng trong kiến trúc hệ thống.
- **Target Audience & Core Value**:
  - **Kỹ sư backend**: Đơn giản hóa kiến trúc hệ thống, loại bỏ các service trung gian thừa, quy về một nguồn chân lý duy nhất (**Single Source of Truth**) cho toàn bộ nghiệp vụ tìm kiếm/khám phá là **Discovery Engine**.
  - **Hệ thống**: Tối ưu hóa tài nguyên runtime (giảm số lượng Bull queue worker, timers và API endpoints dư thừa).

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope (Chỉ thực hiện trên Backend `only-one-be`)**:
  - **Service & Controller Teardown**: Xóa `DataProviderSearchService`, `GenericDataProviderSearchService`, `DataProviderSearchController`, các DTOs (`SearchItemsResponseDto`, `ValidateSearchConfigurationResponseDto`, `SearchItemsRequestDto`, `ProcessSearchDataRequestDto`, `ProcessSearchDataResponse`) và constants/interfaces liên quan đến search mapping (`DATA_PROVIDER_SEARCH_SERVICE_MAP`, `IDataProviderSearchService`, `ISearchConfig`, v.v.).
  - **Feature Runner Teardown**: Xóa `SearchFeatureRunner` và bỏ đăng ký khỏi `FeatureRunnerRegistry`.
  - **Queue & Worker Teardown**: Xóa `SearchWorkerProcessor` trong `worker` module, gỡ bỏ `QUEUE_NAME.SEARCH_JOB` và interface `ISearchJobQueueInterface`.
  - **Schedule Execution Teardown**: Xóa `SearchScheduleService` trong `schedule` module, gỡ bỏ enum `ExecutionServiceEnum.SEARCH`.
  - **Feature Type Preservation**: Giữ nguyên enum `DataProviderFeatureType.SEARCH` để sử dụng làm cấu hình/tính năng Discovery cho các DataProvider.
  - **Module & Wiring Cleanup**: Dọn dẹp `DataProviderModule`, `WorkerModule`, `QueueModule`, `ScheduleModule` và các test suites liên quan.
- **Explicit Out-of-Scope**:
  - **Frontend Updates (`only-one-fe`)**: Việc cập nhật giao diện nếu có sẽ được xử lý ở task riêng biệt bên frontend.
  - **Database Migration for Feature Records**: Không xóa các bản ghi `data_provider_features` có `type = 'search'`, vì `type = 'search'` tiếp tục được sử dụng cho tính năng Discovery.

## 3. Success Metrics (Thước đo Thành công / Definition of Done)
- **Zero Dead Search Code**: Toàn bộ các class/files của legacy search pipeline (`DataProviderSearchService`, `SearchWorkerProcessor`, `SearchScheduleService`, `SearchFeatureRunner`) bị xóa hoàn toàn khỏi codebase.
- **Discovery Engine Stability**: Các endpoints và service của Discovery Engine (`/discovery-sessions`, `DiscoveryRunnerService`, `DiscoveryValidationService`) hoạt động độc lập và ổn định 100%.
- **Compilation & Type Safety**: Lệnh `npm run build` thực thi thành công với exit code 0.
- **Linter & Code Quality**: Lệnh `npm run lint` chạy thành công với 0 lỗi / 0 cảnh báo.

## 4. Proposed High-Level Approach (Hướng tiếp cận Tổng quan)
- Áp dụng quy trình **Clean Teardown & Consolidation**:
  1. Tháo dỡ các tầng phụ thuộc từ ngoài vào trong: Schedule Service $\rightarrow$ Queue Worker $\rightarrow$ Controller $\rightarrow$ Search Service & Runner.
  2. Dọn dẹp các hằng số, enum và interface của queue (`SEARCH_JOB`) và schedule (`ExecutionServiceEnum.SEARCH`).
  3. Cập nhật các module NestJS (`DataProviderModule`, `WorkerModule`, `QueueModule`, `ScheduleModule`) để loại bỏ hoàn toàn các binding thừa.
  4. Xác nhận `DataProviderFeatureType.SEARCH` được gắn kết tự nhiên vào luồng Discovery của DataProvider.
  5. Xác minh toàn diện bằng TypeScript compiler và linter.

---

## 5. Technical English Key Patterns

### 1. Capability Consolidation Pattern
- **Meaning (VI)**: Gom các tính năng rời rạc, chồng chéo vào một module cốt lõi thống nhất.
- **Grammar / Usage**: `consolidate [disparate capabilities/pipelines] into a unified [target engine/system]`
- **Engineering Example**: *"We consolidated the redundant search pipeline into the unified Discovery Engine to establish a single source of truth."*

### 2. Feature Type Repurposing
- **Meaning (VI)**: Tái sử dụng một enum/loại tính năng có sẵn cho kiến trúc mới mà không làm gãy dữ liệu hiện tại.
- **Grammar / Usage**: `repurpose [existing feature type/enum] to back [new workflow/engine]`
- **Engineering Example**: *"The `SEARCH` feature type is retained and repurposed to drive discovery capabilities across data providers."*

### 3. End-to-End Pipeline Teardown
- **Meaning (VI)**: Tháo dỡ toàn bộ chuỗi xử lý từ tầng giao diện API, bộ lập lịch, hàng đợi tới worker xử lý nền.
- **Grammar / Usage**: `execute an end-to-end teardown of [pipeline/subsystem], spanning [controllers, queues, and workers]`
- **Engineering Example**: *"We executed an end-to-end teardown of the search subsystem, eliminating dead workers, schedule services, and queue bindings."*
