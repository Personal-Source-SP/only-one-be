# Concept: Decommission & Remove Legacy DraftItem Feature

## 1. Problem Statement & Root Need (Bối cảnh & Vấn đề Cốt lõi)
- **Core Business Problem**: Trước đây, cơ chế `DraftItem` được sử dụng như một tầng đệm tạm thời để lưu trữ và duyệt các dữ liệu thu thập thô trước khi đưa vào luồng chính. Tuy nhiên, hệ thống hiện đã phát triển toàn diện bộ tính năng **Discovery & Validation Engine** (bao gồm `DiscoverySession`, `DiscoveryUrl`, `DiscoveryValidationBatch`, `DiscoveryValidationLog`), cung cấp quy trình khám phá, phân loại, đánh giá độ tin cậy và phê duyệt URL chuẩn mực và mạnh mẽ hơn rất nhiều. Sự tồn tại song song của `DraftItem` gây dư thừa mã nguồn (dead code), phân mảnh mô hình miền (domain model drift), tăng gánh nặng bảo trì (maintenance overhead) và gây nhầm lẫn trong luồng nghiệp vụ scraping.
- **Target Audience & Core Value**:
  - **Kỹ sư backend & maintainer**: Giảm thiểu nợ kỹ thuật (technical debt), thu gọn blast radius, làm sạch schema cơ sở dữ liệu và tinh gọn cấu trúc module `data-provider`.
  - **Hệ thống**: Tối ưu hóa dung lượng database bằng cách loại bỏ bảng và chỉ mục không còn sử dụng, giữ cho domain model tập trung 100% vào kiến trúc Discovery Engine hiện đại.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope (Chỉ thực hiện trên Backend `only-one-be`)**:
  - **Entity & Database**: Xóa entity `draft-item.entity.ts`. Tạo TypeORM migration thực hiện `DROP TABLE draft_items` theo chiến lược hard drop.
  - **Business Logic & Controller**: Xóa toàn bộ DTOs, service methods, controllers, constants, mappers và repository references liên quan đến `DraftItem`.
  - **Module Definition & Wiring**: Loại bỏ `DraftItem` ra khỏi `DataProviderModule` (TypeOrmModule.forFeature, providers, exports).
  - **Queue / Background Jobs**: Rà soát và gỡ bỏ các queue job, processor hoặc cron tasks liên quan đến việc xử lý draft items (nếu có).
  - **Test Suite Cleanup**: Cập nhật hoặc loại bỏ các test suites (unit test, e2e test) có chứa dependency tới `DraftItem`.
- **Explicit Out-of-Scope**:
  - **Frontend Updates (`only-one-fe`)**: Không can thiệp mã nguồn frontend trong task này. Việc dọn dẹp các UI components/pages liên quan đến draft items sẽ được theo dõi và triển khai ở một task frontend độc lập tiếp theo.
  - **Data Migration / Backup**: Không thực hiện chuyển đổi (migrate) hay sao lưu dữ liệu từ bảng `draft_items` sang `discovery_urls` (áp dụng chiến lược clean break / hard drop theo quyết định nghiệp vụ).

## 3. Success Metrics (Thước đo Thành công / Definition of Done)
- **Zero References**: Tìm kiếm toàn bộ repo `only-one-be` không còn bất kỳ tham chiếu, import hay dead code nào liên quan đến `DraftItem` / `draft-item`.
- **Clean Migration**: Migration `DROP TABLE draft_items` thực thi mượt mà, hỗ trợ cả `up()` (drop table) và `down()` (tái lập cấu trúc nếu cần rollback).
- **Compilation & Type Safety**: Lệnh `npm run build` chạy thành công với 0 lỗi Type checking / TypeScript errors.
- **100% Green Tests**: Bộ kiểm thử tự động (unit tests) chạy hoàn tất và vượt qua 100% không còn fixture/mock lỗi thời liên quan đến draft items.

## 4. Proposed High-Level Approach (Hướng tiếp cận Tổng quan)
- Áp dụng kỹ thuật **Safe Decommissioning & Hard Drop**:
  1. Tiến hành rà soát toàn diện các điểm phụ thuộc của `DraftItem` trong `src/modules/data-provider` và các module lân cận (controllers, services, DTOs, modules).
  2. Xóa bỏ dứt điểm các file mã nguồn của `DraftItem` và cập nhật lại cấu hình module `DataProviderModule`.
  3. Tạo migration TypeORM chuyên dụng để drop bảng `draft_items` trên môi trường database.
  4. Xác minh sự toàn vẹn của codebase thông qua việc build và chạy lại toàn bộ test suite.

---

## 5. Technical English Key Patterns

### 1. Supersede & Decommission Pattern
- **Meaning (VI)**: Diễn tả việc một giải pháp/tính năng mới thay thế hoàn toàn giải pháp cũ, dẫn đến việc loại bỏ giải pháp cũ một cách có hệ thống.
- **Grammar / Usage**: `[New System] has superseded [Old System], prompting the decommissioning of [Old Component].`
- **Engineering Example**: *"Since the Discovery Engine has superseded the legacy draft item workflow, we are actively decommissioning all `DraftItem` artifacts."*

### 2. Clean Break / Rip Out Idiom
- **Meaning (VI)**: Loại bỏ dứt điểm mã nguồn và bảng dữ liệu lỗi thời mà không cần duy trì tính tương thích ngược hay chuyển đổi dữ liệu phức tạp.
- **Grammar / Usage**: `opt for a clean break by ripping out [legacy code/module]`
- **Engineering Example**: *"We opted for a clean break by ripping out the legacy controller and dropping the unused table."*

### 3. Blast Radius Containment
- **Meaning (VI)**: Giới hạn phạm vi tác động của việc thay đổi/xóa mã nguồn trong một ranh giới an toàn (ví dụ: chỉ giới hạn ở tầng backend).
- **Grammar / Usage**: `confine / contain the blast radius to [specific scope/module]`
- **Engineering Example**: *"By decoupling the backend cleanup from frontend changes, we effectively contained the blast radius of this removal."*
