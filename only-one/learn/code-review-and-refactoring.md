# Technical English Learning: Code Review & Refactoring

### 1. Decouple & Teardown Pattern
- **Meaning (VI)**: Tách rời phụ thuộc và tháo dỡ các thành phần lỗi thời theo thứ tự an toàn.
- **Grammar / Usage**: `decouple [dependent module] from [legacy component] prior to executing the teardown.`
- **Engineering Example**:
  > *"We decoupled `SearchWorkerProcessor` from `DraftItemService` before completing the teardown of the draft items module."*
- **Origin Task**: `20260828-195615-decommission-draft-item-feature`

### 2. Invariant Preservation Pattern
- **Meaning (VI)**: Bảo đảm các ràng buộc và hành vi cốt lõi của hệ thống không bị suy thoái trong quá trình tái cấu trúc.
- **Grammar / Usage**: `preserve critical system invariants throughout the migration / refactoring lifecycle.`
- **Engineering Example**:
  > *"By preserving domain invariants, we ensured that the Discovery Engine remained completely unaffected by this deletion."*
- **Origin Task**: `20260828-195615-decommission-draft-item-feature`

### 3. Clean Break Strategy
- **Meaning (VI)**: Chiến lược cắt đứt hoàn toàn phiên bản cũ, xóa triệt để dead code mà không giữ lại boilerplate tương thích ngược.
- **Grammar / Usage**: `execute a clean break to eliminate maintenance overhead and schema drift.`
- **Engineering Example**:
  > *"Adopting a clean break strategy allowed us to purge dead tables and keep our ORM entities lean."*
- **Origin Task**: `20260828-195615-decommission-draft-item-feature`

### 4. Strategy Registry Pruning
- **Meaning (VI)**: Thu gọn danh sách chiến lược đăng ký trong Registry khi một tính năng được tách ra khỏi mô hình runner thông thường.
- **Grammar / Usage**: `prune [retired strategy runner] from the [FeatureRunnerRegistry].`
- **Engineering Example**:
  > *"Pruning `SearchFeatureRunner` from the registry leaves only active, supported capabilities."*
- **Origin Task**: `20260828-200701-decommission-legacy-search-pipeline`

### 5. Zero Out-of-Band Dependencies
- **Meaning (VI)**: Loại bỏ các thư viện hoặc helper ngoài luồng không còn đóng góp vào mục tiêu chính của module.
- **Grammar / Usage**: `Eliminate [out-of-band / extraneous] dependencies from [subsystem]`
- **Engineering Example**:
  > *"By deleting PriceDetectorHelper, we eliminate an extraneous dependency from the discovery subsystem."*
- **Origin Task**: `20260903-161800-purge-price-fields-from-discovery`

### 6. Tighten Validation Constraints
- **Meaning (VI)**: Thắt chặt các ràng buộc kiểm tra hợp lệ dữ liệu đầu vào.
- **Grammar / Usage**: `tighten + validation constraints / rules`
- **Engineering Example**:
  > *"We tightened the validation constraints on request DTOs by replacing `@IsString()` with `@IsEnum(ScraperServiceEnum)`."*
- **Origin Task**: `20260903-214741-set-scraper-service-enum-for-data-provider-feature`

### 7. Graceful Fallback
- **Meaning (VI)**: Cơ chế chuyển đổi dự phòng êm đẹp/tự động nhận giá trị an toàn khi thiếu tham số.
- **Grammar / Usage**: `provide / ensure + graceful fallback`
- **Engineering Example**:
  > *"Using `ScraperServiceEnum.GENERIC` ensures a graceful fallback whenever the client omits the service field."*
- **Origin Task**: `20260903-214741-set-scraper-service-enum-for-data-provider-feature`

