# Concept: Refactor DiscoveryRunner Methods Return Type & Request Parameters

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Trong [DiscoveryRunner](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/runners/discovery.runner.ts), hai phương thức private xử lý crawl/extract là `runApiDiscovery` và `runHtmlDiscovery` đang nhận danh sách tham số dạng positional arguments `(session, targetConfig, targetKeyword, discoveredRecords)`.
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  - `discoveredRecords` được truyền vào dưới dạng một mảng mutable (`DiscoveryUrlEntity[]`) và bị đột biến (mutate in-place) qua `discoveredRecords.push(...)`, trong khi kiểu trả về của hai hàm là `Promise<void>`.
  - Tham số dạng positional parameters khó mở rộng, dễ nhầm thứ tự khi có nhiều optional params (`targetConfig`, `targetKeyword`).
- **Nguyên nhân cốt lõi (Root Cause)**: Thiết kế ban đầu sử dụng cơ chế pass-by-reference mutation để gom dữ liệu thay vì pure function / explicit return value.
- **Tác động (Impact / Blast Radius)**: Hàm mang tính side-effect, khó viết unit test độc lập, giảm tính trong sáng và khả năng bảo trì của mã nguồn trong module `data-provider`.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**:
  - Chuyển đổi tham số đầu vào của `runApiDiscovery` và `runHtmlDiscovery` từ positional arguments sang dạng object request (`IDiscoveryRunnerParams` hoặc `IRunDiscoveryParams`).
  - Thay đổi kiểu trả về từ `Promise<void>` sang `Promise<DiscoveryUrlEntity[]>`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Khai báo interface `IRunDiscoveryParams` (hoặc tương đương) trong [discovery-runner.interface.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/interfaces/discovery-runner.interface.ts).
  - Cập nhật chữ ký hàm `runApiDiscovery` và `runHtmlDiscovery` nhận request object và trả về `Promise<DiscoveryUrlEntity[]>`.
  - Phương thức `runDiscovery()` khởi tạo `discoveredRecords` trực tiếp từ giá trị trả về của `runApiDiscovery` / `runHtmlDiscovery`.
  - Không làm thay đổi logic nghiệp vụ crawl, validation score evaluation, lưu trữ database hay auto-validation.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - Cập nhật interface trong `src/modules/data-provider/interfaces/discovery-runner.interface.ts` và export qua `index.ts`.
  - Tái cấu trúc các private methods `runApiDiscovery`, `runHtmlDiscovery` và luồng gọi tại `runDiscovery` trong `src/modules/data-provider/runners/discovery.runner.ts`.
  - Cập nhật hoặc bổ sung unit test liên quan nếu cần.
- **Explicit Out-of-Scope**:
  - Không thay đổi cấu trúc bảng / Entity `DiscoveryUrlEntity` hay `DiscoverySessionEntity`.
  - Không thay đổi public API hay service layer gọi `DiscoveryRunner.runDiscovery(sessionId, targetKeyword)`.
  - Không sửa đổi logic Puppeteer scraping trong `fetchHtml` hay `ExtractDataHelper`.

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### Solution Comparison (So sánh các phương án)

| Tiêu chí | Phương án 1 (Recommended): Unified Request Interface | Phương án 2: Specific Params Interfaces (`IRunApiDiscoveryParams`, `IRunHtmlDiscoveryParams`) |
| :--- | :--- | :--- |
| **Cơ chế** | Định nghĩa 1 interface dùng chung `IRunDiscoveryParams` cho cả 2 method vì tập tham số tương đồng (`session`, `targetConfig`, `targetKeyword`). | Định nghĩa riêng 2 interface cho API và HTML discovery. |
| **Ưu điểm** | Gọn gàng, nhất quán, giảm boilerplate code, dễ tái sử dụng. | Tách biệt hoàn toàn contract nếu 2 phương thức mở rộng theo các hướng khác nhau trong tương lai. |
| **Nhược điểm** | Không có (hiện tại cả hai đều dùng chung tập thuộc tính cấu hình discovery). | Hơi thừa interface khi cấu trúc hiện tại giống hệt nhau. |
| **Độ phức tạp** | Rất thấp (Low complexity). | Thấp (Low complexity). |

### Core Mechanism (Chi tiết Phương án 1)
1. **Interface Contract**:
   ```typescript
   export interface IRunDiscoveryParams {
       session: DiscoverySessionEntity;
       targetConfig?: ITargetConfig;
       targetKeyword?: string;
   }
   ```

2. **Chữ ký hàm & Luồng xử lý**:
   ```typescript
   private async runApiDiscovery(params: IRunDiscoveryParams): Promise<DiscoveryUrlEntity[]> {
       const { session, targetConfig, targetKeyword } = params;
       const discoveredRecords: DiscoveryUrlEntity[] = [];
       // ... trích xuất và push vào discoveredRecords cục bộ ...
       return discoveredRecords;
   }

   private async runHtmlDiscovery(params: IRunDiscoveryParams): Promise<DiscoveryUrlEntity[]> {
       const { session, targetConfig, targetKeyword } = params;
       const discoveredRecords: DiscoveryUrlEntity[] = [];
       // ... crawl và push vào discoveredRecords cục bộ ...
       return discoveredRecords;
   }
   ```

3. **Tích hợp tại `runDiscovery`**:
   ```typescript
   const params: IRunDiscoveryParams = { session, targetConfig, targetKeyword };
   const discoveredRecords: DiscoveryUrlEntity[] = isApiProvider
       ? await this.runApiDiscovery(params)
       : await this.runHtmlDiscovery(params);
   ```

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)
- **Early Exit / Empty Results**: Cả 2 hàm khi gặp lỗi hoặc không tìm thấy dữ liệu phải luôn trả về mảng rỗng `[]` thay vì `undefined` để đảm bảo an toàn cho `discoveredRecords.length` và `save()`.
- **Max URLs Boundary Limit**: Đảm bảo điều kiện dừng `session.maxUrls != null && discoveredRecords.length >= session.maxUrls` vẫn được bảo toàn nguyên vẹn trong vòng lặp của từng hàm.
