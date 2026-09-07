# Concept: Chuẩn hóa Xử lý Placeholder {query} trong SearchFeatureRunner

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Khi thiết lập hoặc chạy tính năng tìm kiếm (`SearchFeatureRunner`), người dùng truyền cấu hình `url: https://gaigu6.fit/gai-goi/` và `placeholder: '{query}'`.
- **Hiện tượng & Khiếm khuyết kỹ thuật**: Hàm `buildSearchUrl` hiện tại không tạo ra URL dạng path `https://gaigu6.fit/gai-goi/{query}` mà tự ý fallback thêm query param `?q=` $\rightarrow$ sinh ra URL sai `https://gaigu6.fit/gai-goi/?q=<encodedQuery>`.
- **Nguyên nhân cốt lõi (Root Cause)**:
  1. Trong [search-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts#L37-L45), hệ thống đang hỗ trợ cả các placeholder dạng `${query}` không chuẩn và tự động fallback `?q=` hoặc `&q=` khi không tìm thấy placeholder.
  2. Không có logic tự động ghép placeholder `{...}` vào path URL khi URL pattern gốc chưa chứa chuỗi placeholder.
- **Tác động (Impact / Blast Radius)**: Khiến các trang web sử dụng Path-based Search URL (như `/gai-goi/{query}`) không thể crawl/scrape dữ liệu tìm kiếm do URL bị nối sai thành `?q=`.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**: Chuẩn hóa cơ chế xử lý URL tìm kiếm: Chỉ xử lý và thay thế (replace) các placeholder có định dạng `{...}` (ví dụ `{query}`, `{keyword}`), loại bỏ hoàn toàn fallback tự động `?q=`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Khi truyền `searchUrlPattern: https://gaigu6.fit/gai-goi/` và `placeholder: '{query}'` (hoặc pattern đã chứa `{query}`), kết quả URL tạo ra phải là `https://gaigu6.fit/gai-goi/{query}` (hoặc giá trị query được thay thế vào đúng vị trí `{query}`).
  - Chỉ replace các placeholder nằm trong cặp dấu `{}` (như `{query}`, `{keyword}`).
  - Không tự ý thêm `?q=` hay `&q=` khi URL không khai báo query param.
  - Cập nhật toàn bộ Unit Tests tương ứng trong `search-feature.runner.spec.ts`.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Tinh chỉnh hàm `buildSearchUrl` trong `SearchFeatureRunner` ([search-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts)).
  - Chuẩn hóa cơ chế match & replace placeholder `{...}` (chỉ chấp nhận format `{...}`).
  - Cập nhật Unit Tests trong `search-feature.runner.spec.ts`.
- **Explicit Out-of-Scope**:
  - Không thay đổi schema cơ sở dữ liệu `DataProviderFeatureEntity`.
  - Không thay đổi logic scraper core trong `generic-data-provider-search.service.ts`.

---

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### So sánh các phương án giải pháp

| Tiêu chí | Phương án 1 (Strict Placeholder Replacement + Path Concat) *(Khuyến nghị)* | Phương án 2 (Regex `{...}` Auto-Detection) |
| :--- | :--- | :--- |
| **Cơ chế hoạt động** | 1. Lấy `placeholder` từ `config.queryPlaceholder || '{query}'`.<br>2. Nếu `pattern` chứa `placeholder`, replace bằng `encodedQuery`.<br>3. Nếu `pattern` không chứa `placeholder`, tự động nối `placeholder` vào sau path (dùng `/` nếu cần), sau đó replace.<br>4. Loại bỏ hoàn toàn fallback `?q=`. | 1. Dùng Regex `/\{([^}]+)\}/g` để tìm placeholder trong `pattern`.<br>2. Nếu tìm thấy placeholder đầu tiên `{...}`, thay thế bằng `encodedQuery`.<br>3. Nếu không có `{...}`, ghép `/{query}` vào cuối URL. |
| **Ưu điểm** | - Rõ ràng, tường minh, kiểm soát chính xác placeholder người dùng cấu hình.<br>- Không sinh URL rác dạng `?q=`. | - Tự động nhận diện mọi placeholder đặt trong ngoặc nhọn `{...}`. |
| **Nhược điểm** | Cần đảm bảo placeholder được format chuẩn `{name}`. | Có thể replace nhầm các ký tự JSON hoặc regex có `{}` nếu pattern phức tạp. |
| **Độ phức tạp** | Rất thấp, an toàn cao. | Trung bình. |

### Cơ chế hoạt động chi tiết (Phương án 1 - Khuyến nghị)
1. Xác định query: `query = (input?.query || config?.sampleQuery || '').trim()`.
2. Xác định placeholder: `placeholder = config?.queryPlaceholder?.trim() || '{query}'`.
3. Chuẩn hóa pattern:
   - Nếu `pattern` đã chứa `placeholder`: Giữ nguyên pattern.
   - Nếu `pattern` chưa chứa `placeholder` (như `https://gaigu6.fit/gai-goi/`): Nối `placeholder` vào cuối pattern:
     ```typescript
     const normalizedPattern = pattern.endsWith('/') 
       ? `${pattern}${placeholder.startsWith('/') ? placeholder.slice(1) : placeholder}`
       : `${pattern}/${placeholder.startsWith('/') ? placeholder.slice(1) : placeholder}`;
     ```
4. Thực hiện replace: Thay thế `placeholder` trong `pattern` bằng `encodedQuery` (hoặc giữ nguyên nếu không có query).

---

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

- **Kịch bản pattern đã có sẵn query params**: Ví dụ `https://example.com/search?keyword={query}`. Khi đó `pattern.includes(placeholder)` là `true` $\rightarrow$ replace trực tiếp `{query}`, không bị nối thêm `/`.
- **Kịch bản query rỗng**: Nếu `query` rỗng và không có `sampleQuery`, trả về `pattern` đã được chuẩn hóa hoặc trả về pattern ban đầu theo đúng thiết kế.
- **Kịch bản dấu `/` ở cuối**: Xử lý gọn gàng trường hợp `https://example.com/search/` + `{query}` $\rightarrow$ `https://example.com/search/{query}` (tránh bị double slash `//`).
