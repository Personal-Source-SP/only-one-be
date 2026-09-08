# Concept: Tái Cấu Trúc URI Path Cho Config Version Features (Backend & Frontend)

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Hệ thống quản lý lịch sử cấu hình (`ConfigVersionController`) cho các tính năng trích xuất dữ liệu (`DataProviderFeature`).
- **Hiện tượng & Khiếm khuyết kỹ thuật**: `ConfigVersionController` hiện tại đang dùng chung tiền tố route `@Controller('data-provider-features')` với `DataProviderFeatureController`, gây trùng lặp base route và làm nhòe ranh giới tài nguyên giữa quản lý tính năng chính và quản lý phiên bản cấu hình.
- **Nguyên nhân cốt lõi (Root Cause)**: Thiết kế định tuyến ban đầu lồng ghép các endpoint của phiên bản (`:id/versions`, `:id/versions/:versionId/rollback`) vào cùng controller path `data-provider-features` mà không có controller base tách biệt theo đúng ngữ cảnh thực thể.
- **Tác động (Impact / Blast Radius)**:
  - **Backend**: Swagger docs phân tách nhóm nhưng URL gốc bị dẫm chân lên tài nguyên `data-provider-features`.
  - **Frontend**: Các hooks quản lý phiên bản (`useFeatureVersionManager`, `useFeatureHistoryManager`) đang gọi qua endpoint cũ `data-provider-features/${id}/versions...`.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**: Đổi base path của `ConfigVersionController` sang `@Controller('config-version-features')` và đồng bộ toàn bộ lời gọi API trên Frontend (`only-one-fe`).
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **Backend**:
    - Chuyển `@Controller('config-version-features')` và chuẩn hóa các sub-route methods trong `ConfigVersionController`.
    - `GET /config-version-features/:id` (Lấy danh sách các versions theo feature ID).
    - `POST /config-version-features/:id/rollback/:versionId` (Rollback cấu hình feature về version cụ thể).
    - `DELETE /config-version-features/:id/:versionId` (Xóa version không còn active).
  - **Frontend**:
    - Cập nhật cấu hình endpoint trong `only-one-fe/src/config/endpoint.ts`.
    - Đồng bộ nhóm endpoint mới `CONFIG_VERSION_FEATURES` hoặc cập nhật hàm helper `VERSIONS` và `ROLLBACK`.
    - Đảm bảo `useFeatureVersionManager.ts` và `useFeatureHistoryManager.ts` hoạt động chuẩn xác với route mới.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - **Backend (`only-one-be`)**:
    - Cập nhật route decorator trong `src/modules/data-provider/controllers/config-version.controller.ts`.
    - Chuẩn hóa các sub-paths (`path`) trong các method decorators (`@GetRestApi`, `@PostRestApi`, `@DeleteRestApi`).
  - **Frontend (`only-one-fe`)**:
    - Cập nhật định nghĩa endpoint trong `src/config/endpoint.ts`.
    - Cập nhật / kiểm tra các hooks tiêu thụ: `useFeatureVersionManager.ts` và `useFeatureHistoryManager.ts`.
- **Explicit Out-of-Scope**:
  - Không thay đổi logic nghiệp vụ trong `ConfigVersionService` (giữ nguyên logic rollback, snapshot, deactivate version).
  - Không sửa đổi schema database / TypeORM entity `ConfigVersionEntity`.

---

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### Core Mechanism
- Tách ngữ cảnh định tuyến API của `ConfigVersionController` sang `config-version-features`.
- Chuẩn hóa cấu trúc đường dẫn RESTful tinh gọn và đồng bộ contract 2 phía BE - FE:
  ```text
  [GET]    /config-version-features/:id
  [POST]   /config-version-features/:id/rollback/:versionId
  [DELETE] /config-version-features/:id/:versionId
  ```

### API Mapping Matrix (BE & FE Alignment)
| Method | Endpoint Cũ (Old Route) | Endpoint Mới (New Route) | Mục đích / Hành động | Vị trí Frontend sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/data-provider-features/:id/versions` | `/config-version-features/:id` | Lấy danh sách version của feature | `useFeatureVersionManager`, `useFeatureHistoryManager` |
| **POST** | `/data-provider-features/:id/versions/:versionId/rollback` | `/config-version-features/:id/rollback/:versionId` | Rollback cấu hình feature về version | `useFeatureVersionManager`, `useFeatureHistoryManager` |
| **DELETE** | `/data-provider-features/:id/versions/:versionId` | `/config-version-features/:id/:versionId` | Xóa version không active | Sẵn sàng cho tính năng delete version |

### Frontend Changes (`only-one-fe`)
1. **`src/config/endpoint.ts`**:
   Thêm nhóm `CONFIG_VERSION_FEATURES`:
   ```typescript
   CONFIG_VERSION_FEATURES: {
       BASE: prefix('config-version-features'),
       VERSIONS: (featureId: string | number) => prefix(`config-version-features/${featureId}`),
       ROLLBACK: (featureId: string | number, versionId: string | number) =>
           prefix(`config-version-features/${featureId}/rollback/${versionId}`),
       DELETE: (featureId: string | number, versionId: string | number) =>
           prefix(`config-version-features/${featureId}/${versionId}`),
   },
   ```
   *(Đồng thời có thể giữ alias trong `DATA_PROVIDER_FEATURES` để backward compatible hoặc chuyển hẳn sang `CONFIG_VERSION_FEATURES`)*.

2. **Hooks tiêu thụ**:
   - `useFeatureVersionManager.ts`: cập nhật gọi `API_ENDPOINT.CONFIG_VERSION_FEATURES.VERSIONS` & `ROLLBACK`.
   - `useFeatureHistoryManager.ts`: cập nhật gọi `API_ENDPOINT.CONFIG_VERSION_FEATURES.VERSIONS` & `ROLLBACK`.

---

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

- **Đồng bộ triển khai (Deployment Co-ordination)**: Backend và Frontend cần được deploy/cập nhật cùng lúc để tránh lỗi 404 Not Found khi người dùng mở drawer/modal lịch sử phiên bản hoặc thực hiện rollback.
- **Route Param Parsing**: Backend cần đảm bảo `@UUIDParam('id')` và `@Param('versionId', ParseIntPipe)` nhận đúng thứ tự và kiểu dữ liệu từ URL path mới `/config-version-features/:id/rollback/:versionId`.
