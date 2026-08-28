# Concept: Discovery Session Max URLs Optional & Post-Completion Auto-Validation

## 1. Problem Statement & Root Need (Bối cảnh & Vấn đề Cốt lõi)
- **Core Business Problem**:
  1. Hiện tại trong `DiscoverySessionEntity` và `CreateDiscoverySessionDto`, trường `maxUrls` đang có giá trị mặc định cứng là `100` và ràng buộc bắt buộc (non-nullable), hạn chế việc cấu hình các phiên khám phá URL không giới hạn số lượng (unbounded discovery).
  2. Quy trình sau khi Discovery kết thúc hiện vẫn yêu cầu gọi thủ công API kích hoạt Validation (`POST /discovery-sessions/:id/validate`), thiếu tính năng tự động hóa chuỗi xử lý khép kín (Discovery -> Auto-Validation) để giảm thiểu thao tác thủ công của người vận hành.
- **Target Audience & Core Value**:
  - Kỹ sư dữ liệu và vận hành hệ thống scraping; mang lại sự linh hoạt tối đa khi cấu hình phiên cào (có thể giới hạn trần `maxUrls` hoặc chạy tự do `unbounded`), đồng thời tự động hóa hoàn toàn luồng đánh giá chất lượng URL ngay sau khi Discovery Session hoàn thành mà không cần can thiệp thủ công.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - **Entity & Database Schema**:
    - `DiscoverySessionEntity.maxUrls`: Chuyển thành `@Column({ type: 'integer', nullable: true, default: null })` với kiểu `number | null`.
    - `DiscoverySessionEntity.autoValidate`: Bổ sung `@Column({ type: 'boolean', default: true })` với kiểu `boolean`.
  - **DTOs & Validation Rules**:
    - `CreateDiscoverySessionDto` & `UpdateDiscoverySessionDto`:
      - `maxUrls`: Cập nhật decorators `@IsOptional()`, `@IsInt()`, `@Min(1)`.
      - `autoValidate`: Cập nhật decorators `@IsOptional()`, `@IsBoolean()`.
  - **Business Logic & Automation Hook**:
    - *Unbounded Discovery Execution*: Khi `maxUrls` là `null`/`undefined`, discovery engine duyệt toàn bộ URL tìm được theo độ sâu `depth` mà không bị chặn ở ngưỡng 100.
    - *Post-Session Auto-Validation Trigger*: Khi Discovery Session kết thúc thành công (`status = COMPLETED`), nếu `session.autoValidate === true`, hệ thống tự động kích hoạt `DiscoveryValidationService.createValidationBatch` và khởi chạy pipeline validation.
  - **Unit Tests & API Specs**:
    - Viết unit tests kiểm tra: tạo session không truyền `maxUrls` (nhận `null`), tạo session với `autoValidate` (mặc định `true` hoặc truyền `false`), và kiểm tra hook tự động kích hoạt validation khi session hoàn thành.
- **Explicit Out-of-Scope**:
  - Không tự động thực hiện batch enqueue sang `ScrapingData` sau khi validate (vẫn giữ bước người dùng review hoặc trigger enqueue riêng để đảm bảo an toàn dữ liệu).
  - Không thay đổi các thuật toán heuristic validation cốt lõi (Fuzzy Search, Heuristic PDP, Price Detection).

## 3. Success Metrics (Thước đo Thành công / Definition of Done)
- **Flexible Payload Support**: API `POST /discovery-sessions` chấp nhận payload không có `maxUrls` (hoặc `maxUrls: null`) và tự động gán `autoValidate: true` nếu không được truyền.
- **Automated Lifecycle Transition**: Ngay khi Discovery Session chuyển sang trạng thái `COMPLETED` với `autoValidate = true`, một `DiscoveryValidationBatch` mới được khởi tạo và chạy tự động mà không cần gọi API validation thủ công.
- **Test Coverage & Zero Regression**: Đạt 100% pass trên toàn bộ test suite của `data-provider` module, bao gồm các test case mới cho nullable `maxUrls` và auto-validation trigger.

## 4. Proposed High-Level Approach (Hướng tiếp cận Tổng quan)
- Cập nhật định nghĩa thực thể `DiscoverySessionEntity` (`maxUrls` nullable, thêm `autoValidate` default `true`).
- Cập nhật DTOs validation decorators tương ứng.
- Trong `DiscoveryRunnerService` (hoặc service quản lý vòng đời session), tại điểm kết thúc quét thành công (`completeSession`), kiểm tra điều kiện `if (session.autoValidate)` để tự động gọi `DiscoveryValidationService.createValidationBatch(session.id)`.
- Đảm bảo việc kích hoạt auto-validation diễn ra an toàn (non-blocking hoặc qua transaction/event listener thích hợp).

## 5. Technical English Key Patterns
### 1. Post-Completion Lifecycle Hook
- **Meaning (VI)**: Điểm neo vòng đời tự động kích hoạt một tác vụ tiếp theo ngay sau khi tác vụ trước đó hoàn thành thành công.
- **Grammar / Usage**: `Trigger [subsequent action] via a post-completion hook when [condition] is met.`
- **Engineering Example**: *"The discovery engine triggers the heuristic validation pipeline via a post-completion hook whenever `autoValidate` is enabled."*

### 2. Opt-Out Default Configuration
- **Meaning (VI)**: Cấu hình mặc định bật sẵn (`true`), người dùng chỉ cần cấu hình khi muốn chủ động tắt (`opt-out`).
- **Grammar / Usage**: `Configure [feature] with an opt-out default flag (default: true).`
- **Engineering Example**: *"We configured `autoValidate` with an opt-out default (`default: true`) so sessions automatically evaluate discovered URLs unless explicitly disabled."*

### 3. Nullable Constraint with Unbounded Fallback
- **Meaning (VI)**: Ràng buộc cho phép giá trị null, khi không xác định sẽ tự động hoạt động ở chế độ không giới hạn (unbounded).
- **Grammar / Usage**: `Allow a nullable constraint that falls back to unbounded processing.`
- **Engineering Example**: *"The session supports a nullable `maxUrls` constraint, gracefully falling back to unbounded URL discovery."*
