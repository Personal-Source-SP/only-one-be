# Walkthrough: Scraping Discovery & Deterministic URL Validation Engine

## 1. Tổng quan Triển khai (Executive Summary)

Chúng ta đã xây dựng và tích hợp thành công hệ thống **Scraping Discovery & Deterministic URL Validation Engine** tại [src/modules/data-provider](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider) của `only-one-be` để kết nối trực tiếp với giao diện [Scraping Discovery](file:///Users/kiem/Sources/Personal/only-one-fe/src/app/%28root%29/scraping/discovery) trên `only-one-fe`.

Hệ thống kế thừa trọn vẹn kiến trúc và các luồng nghiệp vụ sâu sắc từ [orien-trade-backend](file:///Users/kiem/Sources/Orien-Trade/orien-trade-backend/src/modules/data-provider/services/ai-validation.service.ts), bao gồm:
1. **Discovery Session & Crawler Runner**: Quản lý phiên quét link đệ quy BFS giới hạn theo `depth` và `maxUrls`.
2. **Deterministic Heuristic Validation Engine**: Chấm điểm `confidenceScore` (0.00 – 1.00) và phân loại `EXACT_MATCH`, `PARTIAL_MATCH`, `NO_MATCH` thông qua nhận diện Product Detail Page (PDP), lọc negative keywords, bóc tách giá tiền (`PriceDetectorHelper`), và fuzzy token matching.
3. **Batch Validation & Immutable Audit Logs**: Khởi tạo batch validate hàng loạt, tính toán tiến độ, và lưu vết log kiểm toán chi tiết (`DiscoveryValidationLogEntity`).
4. **User Review Action & Batch Enqueue**: Cho phép người dùng duyệt/từ chối URL (`CONFIRM`, `REJECT`, `EXCLUDE`) và đẩy các URL được phê duyệt (`APPROVED`) sang hàng đợi cào dữ liệu chi tiết (`ScrapingData`).

---

## 2. Chi tiết Thay đổi theo Từng Thành phần

### 2.1 Enums & Data Entities
- **Enums** ([src/modules/data-provider/enums](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/enums)):
  - [discovery-session-status.enum.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/enums/discovery-session-status.enum.ts): `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`.
  - [discovery-url-status.enum.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/enums/discovery-url-status.enum.ts): `DiscoveryUrlStatus`, `DiscoveryValidationStatus`, `ValidationMatchResult`, `ValidationUserAction`, `FinalValidationStatus`, `ValidationBatchStatus`.
- **Entities** ([src/modules/data-provider/entities](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/entities)):
  - [discovery-session.entity.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/entities/discovery-session.entity.ts): Quản lý phiên, mã phiên `sessionCode`, các bộ đếm `totalDiscovered`, `totalValidated`, `totalQueued`.
  - [discovery-url.entity.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/entities/discovery-url.entity.ts): Lưu vết từng URL, `confidenceScore`, giá bóc tách (`detectedPrice`, `detectedCurrency`), và trạng thái duyệt (`finalValidationStatus`).
  - [discovery-validation-batch.entity.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/entities/discovery-validation-batch.entity.ts): Quản lý đợt validate hàng loạt và tiến độ xử lý.
  - [discovery-validation-log.entity.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/entities/discovery-validation-log.entity.ts): Audit log lưu chi tiết tiêu chí khớp và thời gian xử lý.
  - [data-provider.entity.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider.entity.ts): Bổ sung quan hệ 1-N với `discoverySessions` và `discoveryUrls`.

### 2.2 Heuristics & Helpers
- [price-detector.helper.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/helpers/price-detector.helper.ts): Tự động trích xuất số tiền và loại tiền tệ (`$`, `€`, `£`, `₫`, `USD`, `VND`) từ chuỗi HTML title.
- [discovery-validation.helper.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/helpers/discovery-validation.helper.ts): Tính toán điểm tin cậy tổng hợp dựa trên 3 lớp: PDP Path Keywords (0.4) + Price Extraction (0.2) + Token Overlap (0.4) và phạt điểm đối với negative path patterns.

### 2.3 Services & Business Logic
- [discovery-runner.service.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/services/discovery-runner.service.ts): Trích xuất link đệ quy theo BFS, chuẩn hóa URL, deduplicate, và cập nhật trạng thái session.
- [discovery-session.service.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/services/discovery-session.service.ts): Sinh mã `sessionCode`, khởi tạo phiên, chạy background crawl và trả về báo cáo tổng quan.
- [discovery-validation.service.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/services/discovery-validation.service.ts): Thực thi batch validation, lưu log kiểm toán, quản lý user actions duyệt/từ chối URL.
- [discovery-url.service.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/services/discovery-url.service.ts): Chuyển trạng thái URL sang `QUEUED` và tạo bản ghi `ScrapingDataEntity` trong database transaction.

### 2.4 REST API Controllers & DTOs
- [discovery-session.controller.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/controllers/discovery-session.controller.ts):
  - `POST /v1/discovery-sessions`: Tạo phiên khám phá.
  - `GET /v1/discovery-sessions`: Phân trang danh sách phiên (`nestjs-paginate`).
  - `GET /v1/discovery-sessions/:id`: Lấy chi tiết phiên.
  - `GET /v1/discovery-sessions/:id/summary`: Báo cáo chỉ số tổng hợp.
  - `POST /v1/discovery-sessions/:id/validate`: Kích hoạt batch validate.
  - `GET /v1/discovery-sessions/:id/validation-latest-batch`: Lấy tiến độ batch validate mới nhất.
  - `POST /v1/discovery-sessions/:id/bulk-user-actions`: Duyệt/từ chối hàng loạt URL.
  - `POST /v1/discovery-sessions/:id/enqueue-urls`: Đẩy danh sách URL vào hàng đợi cào.
- [discovery-url.controller.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/controllers/discovery-url.controller.ts):
  - `GET /v1/discovery-urls`: Phân trang danh sách URLs (hỗ trợ filter `sessionId`, `status`, `validationStatus`, `matchResult`).
  - `POST /v1/discovery-urls/:id/user-action`: Duyệt/từ chối 1 URL đơn lẻ.
  - `POST /v1/discovery-urls/:id/re-validate`: Đánh giá lại 1 URL đơn lẻ.
  - `GET /v1/discovery-urls/:id/validation-logs`: Xem lịch sử log kiểm toán của URL.

---

## 3. Bằng chứng Kiểm thử (Verification Evidence)

### 3.1 Unit Test Suites
Tất cả 5 test suites bao phủ toàn bộ helper, validation logic, và core services:
1. `src/modules/data-provider/_tests/price-detector.helper.spec.ts`
2. `src/modules/data-provider/_tests/discovery-validation.helper.spec.ts`
3. `src/modules/data-provider/_tests/discovery-validation.service.spec.ts`
4. `src/modules/data-provider/_tests/discovery-session.service.spec.ts`
5. `src/modules/data-provider/_tests/discovery-url.service.spec.ts`

### 3.2 Build & Linting Status
- **TypeScript / NestJS Build**: `npm run build` $\rightarrow$ **Exit Code 0** (Clean compilation).
- **Code Style & Import Sorting**: `npm run lint` $\rightarrow$ **Exit Code 0** (Clean ESLint & Prettier compliance).

---

## 4. Hướng dẫn Test Nhanh (Quick Testing Guide)

1. **Khởi tạo Discovery Session**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/discovery-sessions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -d '{
       "dataProviderId": "<DATA_PROVIDER_UUID>",
       "targetUrl": "https://amazon.com/best-sellers-electronics",
       "depth": 2,
       "maxUrls": 50,
       "targetKeyword": "Wireless Headphones"
     }'
   ```
2. **Kích hoạt Batch Validate**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/discovery-sessions/<SESSION_UUID>/validate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -d '{ "targetKeyword": "Wireless Headphones" }'
   ```
3. **Duyệt URL (User Review)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/discovery-urls/<URL_UUID>/user-action \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -d '{ "action": "confirm", "reason": "Accurate product match" }'
   ```
4. **Đẩy vào Hàng đợi Cào (Batch Enqueue)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/discovery-sessions/<SESSION_UUID>/enqueue-urls \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -d '{ "urlIds": ["<URL_UUID_1>", "<URL_UUID_2>"] }'
   ```
