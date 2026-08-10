# Walkthrough - Tính năng Data Provider Search

Tài liệu này tổng hợp công việc đã thực hiện để triển khai tính năng Tìm kiếm Sản phẩm (Search Products) cho module `data-provider` trong `@only-one-be`.

## 1. Các thay đổi đã thực hiện

### Constants & Contracts
- **[NEW] [data-provider-search-service-map.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/constants/data-provider-search-service-map.ts)**: Định nghĩa `DATA_PROVIDER_SEARCH_SERVICE_MAP` token và `DATA_PROVIDER_SEARCH_SERVICE_MAP_KEY` (`generic`, `amazon`).
- **[NEW] [data-provider-search-service.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/data-provider-search-service.interface.ts)**: Khai báo interface `IDataProviderSearchService` cùng các DTOs/Interfaces tham số liên quan.
- **[MODIFY] [scraper.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/scraper.interface.ts)**: Thêm interface `IScraperRequest`.
- **[MODIFY] [interfaces/index.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/index.ts)**: Re-export `data-provider-search-service.interface`.

### DTOs (Requests & Responses)
- **[NEW] [search-products-response.dto.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/responses/search-products-response.dto.ts)**: Định nghĩa `DiscoveredProductDto`, `SearchProductsResponseDto`, `ValidateSearchConfigurationResponseDto`, `ExtractSearchResultsResponse`.
- **[NEW] [search-products-request.dto.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/search-products-request.dto.ts)**: Định nghĩa `SearchProductsRequestDto`, `TestSearchFunctionRequestDto`, `UpdateSearchConfigRequestDto`.
- **[MODIFY] [dtos/responses/index.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/responses/index.ts)** & **[dtos/requests/index.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/index.ts)**: Export các DTOs mới.

### Helpers & Services
- **[MODIFY] [extract-data.helper.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/extract-data.helper.ts)**: Thêm method `runFunctionSearchData(dto)` thực thi JavaScript function trích xuất danh sách sản phẩm từ HTML.
- **[NEW] [generic-data-provider-search.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts)**: Triển khai `IDataProviderSearchService` cho cào dữ liệu trang kết quả tìm kiếm HTML generic, chuẩn hóa URL sản phẩm/ảnh và lọc số lượng kết quả tối đa.
- **[NEW] [data-provider-search.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search.service.ts)**: Master service kiểm tra trạng thái `READY` của provider, fallback cấu hình từ `parent`, chuyển tiếp request tới Search Service phù hợp trong map.
- **[MODIFY] [data-provider.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider.service.ts)**: Thêm `updateSearchConfig(id, request)` để cập nhật `searchConfig` và tự động cập nhật `searchStatus`.

### Controllers & Module
- **[NEW] [data-provider-search.controller.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/data-provider-search.controller.ts)**: Expose 3 endpoints API:
  - `POST /v1/data-providers/search`: Thực hiện tìm kiếm sản phẩm.
  - `POST /v1/data-providers/test-search-function`: Kiểm thử hàm và cấu hình tìm kiếm.
  - `PUT /v1/data-providers/:id/search-config`: Cập nhật cấu hình tìm kiếm cho Data Provider.
- **[MODIFY] [data-provider.module.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.module.ts)**: Đăng ký `DataProviderSearchService`, `GenericDataProviderSearchService`, `DataProviderSearchController` và `DATA_PROVIDER_SEARCH_SERVICE_MAP`.

---

## 2. Kết quả kiểm tra (Verification Results)

- **Type Check**: Đã chạy `npx tsc --noEmit`. Toàn bộ các file mới và sửa đổi trong module `data-provider` biên dịch thành công 100%, không phát sinh bất kỳ lỗi TypeScript nào.
