# Walkthrough: Decommission & Remove Legacy DraftItem Feature

## 1. Tóm tắt Thay đổi (Executive Summary)
Hoàn thành toàn diện việc loại bỏ (decommission/teardown) tính năng và bảng dữ liệu lỗi thời `DraftItem` trong Backend `only-one-be`. Tất cả các chức năng thu thập và duyệt dữ liệu hiện đã được chuyển giao hoàn toàn cho **Discovery & Validation Engine** (`DiscoverySession`, `DiscoveryUrl`, `DiscoveryValidationBatch`, `DiscoveryValidationLog`).

### Các hạng mục cốt lõi đã thực hiện:
1. **Database Migration**: Tạo migration [`1765500000000-DropDraftItemsTable.ts`](file:///d:/Sources/Personal/only-one-be/src/migrations/1765500000000-DropDraftItemsTable.ts) để drop bảng `draft_items` cùng 3 indexes (`IDX_draft_items_code`, `IDX_draft_items_status`, `IDX_draft_items_feature_url`).
2. **Entity & Relations Cleanup**:
   - Gỡ bỏ hoàn toàn `DraftItemEntity`.
   - Dọn dẹp quan hệ `suggestedDraftItems` và `mappedDraftItems` trong [`ItemEntity`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/item.entity.ts).
   - Dọn dẹp quan hệ `draftItems` trong [`DataProviderFeatureEntity`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts).
3. **Service & Architecture Decoupling**:
   - Di chuyển và tái cấu trúc phương thức `processSearchData` sang [`DataProviderSearchService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search.service.ts), loại bỏ cơ chế lưu draft items và chuẩn hóa kết quả về `totalItemsFound`.
   - Cập nhật [`SearchWorkerProcessor`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/search-worker.processor.ts) inject và sử dụng trực tiếp `DataProviderSearchService`.
4. **Dead Code Elimination**: Xóa sạch 9 file mã nguồn không còn sử dụng:
   - `draft-item.entity.ts`
   - `draft-item.controller.ts`
   - `draft-item.service.ts`
   - `draft-item.dto.ts`
   - `draft-item-request.dto.ts`
   - `draft-item-pagination.config.ts`
   - `draft-item-status.enum.ts`
   - `map-draft-item-action.enum.ts`
   - `draft-item.service.spec.ts`
5. **Module & Mapping Wiring**:
   - Cập nhật [`DataProviderModule`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.module.ts) và [`DataProviderProfile`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.profile.ts).
   - Tinh gọn các barrel exports tại `enums/index.ts` và `dtos/requests/index.ts`.

---

## 2. Chi tiết File Thay đổi (File Changes Summary)

| Loại thay đổi | Đường dẫn File | Mô tả chi tiết |
| :--- | :--- | :--- |
| **`[NEW]`** | `src/migrations/1765500000000-DropDraftItemsTable.ts` | TypeORM migration drop bảng `draft_items` và indexes |
| **`[MODIFY]`** | `src/modules/data-provider/entities/item.entity.ts` | Gỡ bỏ `DraftItemEntity` relations |
| **`[MODIFY]`** | `src/modules/data-provider/entities/data-provider-feature.entity.ts` | Gỡ bỏ `draftItems` OneToMany relation |
| **`[MODIFY]`** | `src/modules/data-provider/services/data-provider-search.service.ts` | Thêm coordinator `processSearchData` độc lập |
| **`[MODIFY]`** | `src/modules/data-provider/dtos/responses/process-search-data-response.dto.ts` | Chuẩn hóa field `totalItemsFound` |
| **`[MODIFY]`** | `src/modules/worker/processors/search-worker.processor.ts` | Chuyển dependency sang `DataProviderSearchService` |
| **`[MODIFY]`** | `src/modules/worker/_tests/search-worker.processor.spec.ts` | Cập nhật mock service và payload test |
| **`[MODIFY]`** | `src/modules/data-provider/data-provider.profile.ts` | Xóa AutoMapper profile của DraftItem |
| **`[MODIFY]`** | `src/modules/data-provider/data-provider.module.ts` | Gỡ bỏ providers/controllers/entities của DraftItem |
| **`[MODIFY]`** | `src/modules/data-provider/enums/index.ts` | Xóa enum exports thừa |
| **`[MODIFY]`** | `src/modules/data-provider/dtos/requests/index.ts` | Xóa DTO exports thừa |
| **`[DELETE]`** | `src/modules/data-provider/entities/draft-item.entity.ts` | Xóa entity |
| **`[DELETE]`** | `src/modules/data-provider/controllers/draft-item.controller.ts` | Xóa controller |
| **`[DELETE]`** | `src/modules/data-provider/services/draft-item.service.ts` | Xóa service |
| **`[DELETE]`** | `src/modules/data-provider/dtos/draft-item.dto.ts` | Xóa DTO |
| **`[DELETE]`** | `src/modules/data-provider/dtos/requests/draft-item-request.dto.ts` | Xóa request DTO |
| **`[DELETE]`** | `src/modules/data-provider/constants/draft-item-pagination.config.ts` | Xóa pagination config |
| **`[DELETE]`** | `src/modules/data-provider/enums/draft-item-status.enum.ts` | Xóa enum |
| **`[DELETE]`** | `src/modules/data-provider/enums/map-draft-item-action.enum.ts` | Xóa enum |
| **`[DELETE]`** | `src/modules/data-provider/_tests/draft-item.service.spec.ts` | Xóa test file cũ |

---

## 3. Bằng chứng Xác minh & Kiểm thử (Verification Evidence)

### 3.1 TypeScript Build & Type Checking (`npm run build`)
- **Command**: `npm run build`
- **Output**:
```text
> only-one-be@0.0.1 build
> rimraf dist && tsc -p tsconfig.build.json && nest build

Exit Code: 0 (Success)
```
- **Kết luận**: Codebase hoàn toàn sạch sẽ, không còn bất kỳ dangling reference hay type error nào.

### 3.2 Verification via Zero-Reference Grep
- Tìm kiếm toàn bộ `src/` đối với `draftitem`, `draft_item`, `draft-item`:
  - Chỉ còn lại 2 files migration lịch sử (`1765400000000-CreateDraftItemsTable.ts` và `1765500000000-DropDraftItemsTable.ts`).
  - 100% mã nguồn ứng dụng không còn bất kỳ dấu vết nào của `DraftItem`.

---

## 4. Hướng dẫn Kiểm thử Thủ công (Manual Verification & DB Run)
Để áp dụng migration xóa bảng `draft_items` trên database môi trường phát triển:

```bash
# Chạy migration drop bảng
npm run migration:run

# Hoặc nếu cần rollback thử nghiệm
npm run migration:revert
```
