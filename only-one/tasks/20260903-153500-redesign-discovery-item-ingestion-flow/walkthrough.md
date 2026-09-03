# Walkthrough: Tái cấu trúc Luồng Discovery sang Item Ingestion (Loại bỏ ScrapingDataEntity)

## 1. Tóm tắt Thay đổi (Summary of Changes)
Đã hoàn tất dọn dẹp và chuẩn hóa toàn bộ luồng **Discovery $\rightarrow$ Validation $\rightarrow$ Item Ingestion**, đồng thời **loại bỏ hoàn toàn logic tạo `ScrapingDataEntity` cũ**:

1. **Enum [`DiscoveryUrlStatus`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/enums/discovery-url-status.enum.ts)**:
   - Thêm trạng thái `INGESTED = 'ingested'` để biểu thị URL đã được phân giải và nạp thành công vào bảng `items` / `data_provider_items`.
2. **DTO [`IngestDiscoveryUrlResponseDto`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/dtos/responses/ingest-discovery-url-response.dto.ts)**:
   - Response class chuẩn hóa kết quả nạp: `totalProcessed`, `itemsCreated`, `itemsReused`, `dataProviderItemsCreated`.
3. **Service [`DiscoveryUrlService`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-url.service.ts)**:
   - **Xóa bỏ hoàn toàn hàm cũ `batchEnqueue`** và dependency `ScrapingDataEntity`.
   - Bổ sung hàm `extractCodeFromUrl`: Trích xuất SKU/Code từ query params (`sku`, `code`, `productId`, `id`) hoặc URL pattern (`/dp/`, `/product/`, `/item/`).
   - Bổ sung hàm `ingestDiscoveredUrl`:
     - Kiểm tra `Item` theo `code` trước.
     - Nếu không có `code` hoặc không khớp, fallback kiểm tra theo `name` (Title).
     - Nếu chưa có, tạo mới `ItemEntity` qua `ItemService.create`.
     - Kiểm tra và tạo `DataProviderItemEntity` (liên kết `itemId` + `dataProviderId` + `itemUrl`).
     - Cập nhật trạng thái `DiscoveryUrl` thành `INGESTED`.
   - Bổ sung hàm `batchIngest`: Nạp hàng loạt URL đã được duyệt (`APPROVED`).
4. **Service [`DiscoveryValidationService`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-validation.service.ts)**:
   - Khi duyệt `submitUserAction` hoặc `submitBulkUserActions` với action `CONFIRM`, tự động kích hoạt `ingestDiscoveredUrl` để chuyển hóa URL thành Item ngay lập tức.
5. **Controller & Service [`DiscoverySessionController`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/controllers/discovery-session.controller.ts) & [`DiscoverySessionService`](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/discovery-session.service.ts)**:
   - Xóa bỏ endpoint cũ `POST :id/enqueue-urls`.
   - Bổ sung endpoint mới `POST /api/v1/discovery-sessions/:id/ingest-urls`.

---

## 2. Kết quả Kiểm thử & Xác thực (Verification Results)

### Verification Suite
| Kiểm tra | Kết quả | Chi tiết |
| :--- | :--- | :--- |
| **Lint & Formatting** | ✅ PASSED | `ESLINT_USE_FLAT_CONFIG=false npx eslint ... --fix` hoàn tất không có lỗi |
| **TypeScript Build Check** | ✅ PASSED | `npx tsc -p tsconfig.build.json --noEmit` hoàn tất không có lỗi |
