# Concept: Chuẩn hóa Toàn bộ App Error Code trong Data Provider Services

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Tầng Service trong module `src/modules/data-provider/services/` (`config-version.service.ts`, `data-provider-item.service.ts`, `discovery-validation.service.ts`).
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  1. `config-version.service.ts` vẫn ném trực tiếp `NotFoundException` và `BadRequestException` kèm chuỗi text hardcoded khi không tìm thấy config version hoặc khi cố xoá active version.
  2. `data-provider-item.service.ts` ném rải rác các `NotFoundException` (khi không tìm thấy item, data provider, data provider item) và `BadRequestException` (khi url không khớp `baseUrl` hoặc item đã tồn tại).
  3. `discovery-validation.service.ts` ném trực tiếp `NotFoundException`, `BadRequestException`, và `InternalServerErrorException` với raw text thay vì mã lỗi có cấu trúc.
- **Nguyên nhân cốt lõi (Root Cause)**:
  - Chưa quy hoạch và khai báo tập trung các `IAppError` tương ứng trong từ điển mã lỗi `DataProviderError` (`data-provider-error.ts`).
  - Các service được viết ở các giai đoạn khác nhau chưa tuân thủ quy tắc repository negative rules (`[AVOID] Coercing all unhandled exceptions into raw BadRequestException/NotFoundException...`).
- **Tác động (Impact / Blast Radius)**:
  - Client nhận HTTP response với error format không đồng nhất (thiếu trường `code`, `params` phục vụ i18n và UI error handling).
  - Không thể map localized messages chính xác ở tầng frontend.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**:
  - Chuẩn hóa 100% các câu lệnh ném ngoại lệ trong toàn bộ các service thuộc `src/modules/data-provider/services/` sang sử dụng `throw new AppException(DataProviderError.*)`.
  - Mở rộng từ điển `DataProviderError` với đầy đủ mã lỗi `code`, `message` tiếng Việt chuẩn, HTTP status code phù hợp và `params` metadata.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Bổ sung các `IAppError` vào `DataProviderError`:
    - `ConfigVersionNotFound(versionId, featureId?)` (HTTP 404)
    - `CannotDeleteActiveConfigVersion` (HTTP 400)
    - `DataProviderItemNotFound(id)` (HTTP 404)
    - `DataProviderItemNotFoundByProviderId(dataProviderId)` (HTTP 404)
    - `DataProviderItemAlreadyExists` (HTTP 400)
    - `InvalidItemUrl(expectedBaseUrl, gotUrl)` (HTTP 400)
    - `NoDiscoveredUrlsFound(sessionId)` (HTTP 400)
    - `ValidationBatchNotFound(batchId)` (HTTP 404)
    - `BatchAlreadyFinishedOrCancelled` (HTTP 400)
    - `FailedToQueueValidationJobs` (HTTP 500)
  - Không còn bất kỳ câu lệnh `throw new NotFoundException(...)`, `throw new BadRequestException(...)`, `throw new InternalServerErrorException(...)` nào trong các file service thuộc `data-provider`.
  - Tất cả các unit test liên quan được cập nhật để verify `AppException`.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - `src/modules/data-provider/constants/data-provider-error.ts`: Khai báo các error contracts mới.
  - `src/modules/data-provider/services/config-version.service.ts`: Thay thế raw exceptions bằng `AppException`.
  - `src/modules/data-provider/services/data-provider-item.service.ts`: Thay thế raw exceptions bằng `AppException`.
  - `src/modules/data-provider/services/discovery-validation.service.ts`: Thay thế raw exceptions bằng `AppException`.
  - Cập nhật test suites trong `src/modules/data-provider/services/_tests/` (nếu có assertion kiểm tra exception).
- **Explicit Out-of-Scope**:
  - Sửa đổi các service ở các module khác (`src/modules/worker/`, `src/modules/auth/`, v.v.).
  - Sửa đổi schema TypeORM database / entities.
  - Thay đổi logic nghiệp vụ cốt lõi (chỉ thay đổi lớp exception ném ra).

---

## 3. Solution Options & Trade-offs (Giải pháp Kiến trúc)

### Option 1: Granular Semantic Error Definition in DataProviderError (Recommended)
- **Cơ chế**:
  - Định nghĩa tường minh từng hàm/hằng số `IAppError` trong `DataProviderError` với semantic error code rõ ràng (vd: `data_provider_config_version_not_found`, `data_provider_cannot_delete_active_config_version`, `data_provider_invalid_item_url`, `discovery_validation_batch_not_found`...).
  - Đính kèm `params` chứa dynamic values (`versionId`, `featureId`, `expectedBaseUrl`, `gotUrl`...) giúp client/frontend có đủ context render UI hoặc dịch đa ngôn ngữ.
- **Ưu điểm**:
  - Chuẩn RESTful & Clean Architecture cao nhất, tuân thủ 100% repository rules.
  - Hỗ trợ i18n và debug truy vết lỗi chi tiết.
- **Nhược điểm / Trade-off**:
  - Thêm một số dòng code khai báo trong file `data-provider-error.ts`.

### Option 2: Generic Resource Not Found & Bad Request Coercion
- **Cơ chế**:
  - Tái sử dụng các mã chung như `ResourceNotFound(entity, id)` hoặc `InvalidRequest(reason)`.
- **Ưu điểm**:
  - Ít khai báo mã lỗi mới trong file constant.
- **Nhược điểm**:
  - Mã lỗi quá chung chung, client không phân biệt được nguyên nhân nghiệp vụ cụ thể (ví dụ: không phân biệt được lỗi do `itemUrl` không khớp `baseUrl` hay do thiếu field).

> **Lựa chọn đề xuất**: **Option 1 (Granular Semantic Error Definition)** để đồng bộ với toàn bộ hệ thống `only-one-be`.

---

## 4. Core Mechanism & Logic Flow (Cơ chế & Luồng Xử lý)

### Mapping Bảng Mã Lỗi Chi Tiết

| Service | Vị trí lỗi hiện tại | Mã lỗi mới (`code`) | HTTP Status |
| :--- | :--- | :--- | :---: |
| `config-version.service.ts` | Không tìm thấy version theo feature | `data_provider_config_version_not_found` | 404 |
| `config-version.service.ts` | Không cho phép xoá active version | `data_provider_cannot_delete_active_config_version` | 400 |
| `data-provider-item.service.ts` | Không tìm thấy DataProviderItem theo ID | `data_provider_item_not_found` | 404 |
| `data-provider-item.service.ts` | Không tìm thấy DataProviderItem theo providerId | `data_provider_item_not_found_by_provider` | 404 |
| `data-provider-item.service.ts` | ItemUrl không khớp baseUrl của Provider | `data_provider_item_url_invalid` | 400 |
| `data-provider-item.service.ts` | DataProviderItem đã tồn tại | `data_provider_item_already_exists` | 400 |
| `discovery-validation.service.ts` | Không có URL nào trong session để validate | `discovery_no_urls_for_validation` | 400 |
| `discovery-validation.service.ts` | Không tìm thấy validation batch | `discovery_validation_batch_not_found` | 404 |
| `discovery-validation.service.ts` | Batch đã kết thúc hoặc bị hủy | `discovery_validation_batch_already_finished` | 400 |
| `discovery-validation.service.ts` | Lỗi đẩy jobs vào Redis Queue | `discovery_validation_queue_failed` | 500 |

---

## 5. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

1. **Client Compatibility**:
   - Thay vì nhận response dạng `{"statusCode": 404, "message": "Config version 1 not found..."}`, client sẽ nhận payload chuẩn `{ "success": false, "error": { "code": "data_provider_config_version_not_found", "message": "...", "params": {...} } }`.
   - Cần đảm bảo frontend bắt theo `error.code` thay vì match hardcoded string message.
2. **Unit Test Assertions**:
   - Các unit test cũ assert `rejects.toThrow(NotFoundException)` cần được cập nhật thành `rejects.toThrow(AppException)`.
