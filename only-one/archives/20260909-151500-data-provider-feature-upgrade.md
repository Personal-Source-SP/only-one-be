---
id: 20260909-151500-data-provider-feature-upgrade
title: Nâng cấp Data Provider Feature Service & Controller (Pre-Test Verification, Limit 3 Results & Clean Routes)
archived_at: 2026-09-09
status: active
references:
  - only-one/archives/20260908-080500-data-provider-and-discovery-engine.md
affected_modules:
  - src/modules/data-provider/services/data-provider-feature.service.ts
  - src/modules/data-provider/controllers/data-provider-feature.controller.ts
  - src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts
---

# Archive: Nâng cấp Data Provider Feature Service & Controller (Pre-Test Verification, Limit 3 Results & Clean Routes)

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**:
  - Khi người dùng tạo mới feature (`SCRAPING`, `SEARCH`), cấu hình được lưu trực tiếp vào database mà không có cơ chế chạy thử nghiệm với dữ liệu thực tế (`input`), dẫn đến việc lưu cấu hình lỗi/hỏng.
  - Endpoint `POST /data-provider-features/test` trả về toàn bộ mảng dữ liệu trích xuất từ crawler, gây phình to payload preview trên frontend.
  - Route path trong `DataProviderFeatureController` chứa tiền tố thừa `data-providers/:dataProviderId`.
- **Giá trị (Value)**:
  - Tự động chạy kiểm thử (`testStateless`) trước khi lưu feature nếu request có truyền `input` (fail-fast, set status `READY` khi pass test).
  - Tự động giới hạn mảng trích xuất `data` tối đa 3 phần tử trong `testStateless`, giúp giao diện preview tải nhẹ và phản hồi tức thì.
  - Tinh gọn route paths (`provider/:dataProviderId`) và đồng bộ hóa với frontend client.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Pre-Test Execution trong `createFeature`**:
  - `CreateDataProviderFeatureRequestDto` có thêm trường `input?: Record<string, unknown>`.
  - Nếu có `request.input`, `DataProviderFeatureService.createFeature` gọi `runnerRegistry.getRunner(request.type).testStateless(...)` trước khi tạo entity.
  - Trạng thái entity được khởi tạo là `READY` nếu có `input` hợp lệ, hoặc `UNCONFIGURED` nếu tạo bản nháp không truyền `input`.
- **Sandbox Result Truncation**:
  - `DataProviderFeatureController.testStateless` thực hiện `result.data = result.data.slice(0, 3)` khi `result.data` là một mảng.
- **Route Normalization**:
  - Sửa `@Get('data-providers/:dataProviderId')` $\rightarrow$ `@Get('provider/:dataProviderId')`.
  - Sửa `@Get('data-providers/:dataProviderId/:type')` $\rightarrow$ `@Get('provider/:dataProviderId/:type')`.
  - Sửa `@Post('data-providers/:dataProviderId')` $\rightarrow$ `@Post('provider/:dataProviderId')`.
  - Cập nhật tương ứng trên frontend (`endpoint.ts`, `ScrapingConfigForm`, `SearchConfigForm`).

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [data-provider-feature-request.dto.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts): Bổ sung trường `input` vào `CreateDataProviderFeatureRequestDto`.
- [data-provider-feature.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts): Tích hợp pre-validation qua `runnerRegistry.getRunner()`.
- [data-provider-feature.controller.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts): Cập nhật route và slice top 3 kết quả test.
- [endpoint.ts](file:///Users/kiem/Sources/PERSONAL/only-one-fe/src/config/endpoint.ts): Cập nhật `API_ENDPOINT.DATA_PROVIDER_FEATURES.BY_PROVIDER`.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Trạng thái Build & Test**: 100% Passed.
- **Linter**: 0 errors, 0 warnings (Cả BE và FE).
