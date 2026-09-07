# Concept: Bổ sung Main Content Selector vào ExtractSearchDataHelper

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Khi crawl dữ liệu tìm kiếm bằng `GenericDataProviderSearchService` và `ExtractSearchDataHelper`, người dùng/cấu hình `targetConfig` có thể chỉ định `mainContentSelector` và `isGetParentElement` để khoanh vùng DOM chính chứa danh sách kết quả tìm kiếm.
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  - So với [`ExtractDataHelper`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/extract-data.helper.ts#L22-L28), [`ExtractSearchDataHelper`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/extract-search-data.helper.ts#L10-L49) đang thiếu bước tiền xử lý HTML (`transformHtmlContent` - lọc bỏ thẻ `<style>`, CSS `<link>`) và bước cắt lọc DOM theo `mainContentSelector` / `isGetParentElement` (`getMainContent`).
  - [`IRunSearchFunctionExtractData`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts#L55-L60) và [`GenericDataProviderSearchService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts#L17-L34) chưa truyền các trường `mainContentSelector` và `isGetParentElement` vào helper.
- **Nguyên nhân cốt lõi (Root Cause)**: Khi tách riêng `ExtractSearchDataHelper` cho module tìm kiếm, các hàm helper `getMainContent` và `transformHtmlContent` chưa được đồng bộ sang `ExtractSearchDataHelper`.
- **Tác động (Impact / Blast Radius)**:
  - Hàm `searchData(html)` nhận toàn bộ HTML thô (bao gồm cả header, footer, sidebar, thẻ script/style rác), làm tăng bộ nhớ cheerio và dễ gây trích xuất nhầm các liên kết ngoài vùng kết quả tìm kiếm chính.
  - Cấu hình `mainContentSelector` trong `ISearchTargetConfig` bị vô hiệu hóa trong luồng tìm kiếm.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**: Đồng bộ cơ chế tiền xử lý HTML (`transformHtmlContent`) và lọc `mainContent` (`getMainContent`) từ `ExtractDataHelper` sang `ExtractSearchDataHelper`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - `IRunSearchFunctionExtractData` bổ sung 2 trường tùy chọn: `mainContentSelector?: string` và `isGetParentElement?: boolean`.
  - `GenericDataProviderSearchService` truyền `mainContentSelector` và `isGetParentElement` từ `targetConfig` vào `extractSearchDataHelper.runFunctionExtractSearchData`.
  - `ExtractSearchDataHelper.runFunctionExtractSearchData`:
    - Làm sạch HTML bằng `transformHtmlContent`.
    - Nếu có `mainContentSelector`: Lọc lấy outer HTML của selector (hoặc `.parent()` nếu `isGetParentElement: true`). Nếu không tìm thấy main content selector $\rightarrow$ throw error rõ ràng `Main content not found for selector: ...`.
    - Nếu không có `mainContentSelector`: Tiếp tục truyền `htmlContentTransformed` vào `runFn(html)`.
  - Bổ sung Unit Tests kiểm tra trường hợp có và không có `mainContentSelector`, `isGetParentElement`.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Cập nhật interface `IRunSearchFunctionExtractData` trong [target-config.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts).
  - Cập nhật [extract-search-data.helper.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/extract-search-data.helper.ts) bổ sung `getMainContent` và `transformHtmlContent`.
  - Cập nhật [generic-data-provider-search.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts) để truyền `mainContentSelector` và `isGetParentElement`.
  - Cập nhật Unit Tests trong `extract-search-data.helper.spec.ts`.
- **Explicit Out-of-Scope**:
  - Không thay đổi luồng API search (`ApiDataProviderSearchService` / `runApiFunctionExtractSearchData`) vì API nhận payload JSON trực tiếp, không qua DOM.
  - Không thay đổi schema DB.

---

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### So sánh các phương án giải pháp

| Tiêu chí | Phương án 1: Trực tiếp tích hợp `getMainContent` & `transformHtmlContent` vào `ExtractSearchDataHelper` *(Khuyến nghị)* | Phương án 2: Tách `getMainContent` thành Shared DOM Utility |
| :--- | :--- | :--- |
| **Cơ chế hoạt động** | Thêm các hàm private `getMainContent` và `transformHtmlContent` trực tiếp vào `ExtractSearchDataHelper` giống hệt pattern chuẩn đã có ở `ExtractDataHelper`. | Tạo một file `dom-extract.util.ts` và refactor cả `ExtractDataHelper` lẫn `ExtractSearchDataHelper` cùng import chung. |
| **Ưu điểm** | - Đơn giản, tính độc lập cao giữa các helper module.<br>- Zero blast radius đối với `ExtractDataHelper` đang chạy ổn định. | Tái sử dụng code tốt hơn về mặt DRY. |
| **Nhược điểm** | Trùng lặp một số dòng logic tiện ích DOM nhỏ giữa 2 helper. | Cần chạm vào và test lại cả `ExtractDataHelper` (mở rộng blast radius không cần thiết). |
| **Độ phức tạp** | Rất thấp. | Trung bình. |

### Cơ chế hoạt động chi tiết (Phương án 1 - Khuyến nghị)
1. Trong `IRunSearchFunctionExtractData`:
   ```typescript
   export interface IRunSearchFunctionExtractData {
       htmlContent: string;
       functionGenerator: string;
       resultSelector?: string;
       maxResults?: number;
       mainContentSelector?: string;
       isGetParentElement?: boolean;
   }
   ```
2. Trong `GenericDataProviderSearchService`:
   ```typescript
   const { functionGenerator, resultSelector, maxResults, mainContentSelector, isGetParentElement } = targetConfig;
   const extractData = await this.extractSearchDataHelper.runFunctionExtractSearchData({
       htmlContent: html,
       functionGenerator,
       resultSelector,
       maxResults,
       mainContentSelector,
       isGetParentElement,
   });
   ```
3. Trong `ExtractSearchDataHelper.runFunctionExtractSearchData`:
   - Tiền xử lý: `htmlContentTransformed = this.transformHtmlContent(htmlContent)`.
   - Cắt DOM:
     ```typescript
     const mainContent = this.getMainContent({
         html: htmlContentTransformed,
         options: { mainContentSelector, isChildren: isGetParentElement },
     });
     if (!mainContent) {
         throw new Error(`Main content not found for selector: ${mainContentSelector}`);
     }
     ```
   - Chạy hàm trích xuất: `const result = runFn(mainContent)`.

---

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

- **Kịch bản không truyền `mainContentSelector`**: `getMainContent` phải fallback trả về toàn bộ `htmlContentTransformed` bình thường (giống như `ExtractDataHelper`).
- **Kịch bản `mainContentSelector` không tồn tại trong trang**: Ném lỗi `Main content not found for selector: ...` để trả về error rõ ràng trong `ISearchExtractDataResponse`.
- **Kịch bản `isGetParentElement` = true**: Gọi `.parent()` trên Cheerio element để lấy thẻ bọc ngoài bao quát kết quả.
