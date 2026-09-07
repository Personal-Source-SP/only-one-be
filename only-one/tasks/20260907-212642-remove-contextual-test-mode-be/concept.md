# Concept: Loại Bỏ Chế Độ Contextual Test Ở Backend (Data Provider Feature)

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Module `data-provider` trong `only-one-be` hiện cung cấp 2 cơ chế kiểm thử tính năng cào dữ liệu: `Stateless Test` (`POST /data-provider-features/test`) và `Contextual Test` (`POST /data-provider-features/:id/test`).
- **Hiện tượng & Khiếm khuyết kỹ thuật**: Chế độ `Contextual Test` phụ thuộc vào việc tìm entity `DataProviderFeature` và `activeVersion` đã lưu trong database. Điều này gây dư thừa mã nguồn, phân mảnh luồng chạy test giữa sandbox thời gian thực (real-time draft test) và DB-persisted test, đồng thời tăng chi phí bảo trì logic runner.
- **Nguyên nhân cốt lõi (Root Cause)**: Thiết kế ban đầu tách biệt 2 luồng test (test khi chưa lưu vs test cấu hình đã lưu). Tuy nhiên, cơ chế `Stateless Test` đã hoàn toàn bao quát toàn bộ nhu cầu kiểm thử (chỉ cần truyền config & input từ payload).
- **Tác động (Impact / Blast Radius)**: Gây phân tán API endpoints, dư thừa DTO và service methods không còn cần thiết ở Backend.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**: Loại bỏ hoàn toàn endpoint và logic xử lý `Contextual Test` tại `only-one-be`, thống nhất duy nhất 1 cơ chế kiểm thử là `Stateless Test`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Xóa bỏ endpoint `POST :id/test` trong [DataProviderFeatureController](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts).
  - Xóa bỏ method `testFeature(id, input)` trong `DataProviderFeatureService`.
  - Xóa bỏ DTO `TestFeatureContextualRequestDto` trong `data-provider-feature-request.dto.ts`.
  - Dọn dẹp các unused imports liên quan trong module `data-provider`.
  - Đảm bảo Backend build thành công (`npm run build`), không có lỗi biên dịch TypeScript.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Gỡ bỏ `DataProviderFeatureController.testContextual`.
  - Gỡ bỏ `DataProviderFeatureService.testFeature`.
  - Gỡ bỏ class `TestFeatureContextualRequestDto`.
  - Dọn sạch imports và references liên quan trong `only-one-be`.
- **Explicit Out-of-Scope**:
  - Không chỉnh sửa Frontend `only-one-fe` (`useFeatureTestRunner.ts`, `TestModeSelector.tsx`...) trong task này (sẽ thực hiện ở task riêng sau khi hoàn tất BE).
  - Không thay đổi hành vi hoặc cấu trúc request/response của `testStateless` (`POST /data-provider-features/test`).
  - Không sửa đổi logic core của các `FeatureRunner` (`ScrapingFeatureRunner`, `SearchFeatureRunner`...).

---

## 3. Solution Options & Trade-offs (Giải pháp Đề xuất & Đánh đổi)

### Option 1: Trực tiếp loại bỏ hoàn toàn (Direct Clean-up / Recommended)
- **Mô tả**: Xóa bỏ hoàn toàn endpoint `POST :id/test`, method service `testFeature`, và DTO `TestFeatureContextualRequestDto`.
- **Ưu điểm**:
  - Mã nguồn sạch sẽ, không để lại dead code hoặc deprecated code.
  - Loại bỏ hoàn toàn overhead truy vấn DB khi chạy test.
- **Nhược điểm / Trade-off**:
  - Nếu client nào đó (như FE cũ) vô tình gọi vào `POST :id/test` sẽ nhận ngay mã lỗi `404 Not Found`. (Phù hợp vì FE đang chuẩn bị được refactor đồng bộ).
- **Độ phức tạp**: Rất thấp (Thực hiện nhanh, an toàn).

### Option 2: Đánh dấu Deprecated và ủy quyền sang Stateless (Soft Deprecation)
- **Mô tả**: Giữ lại endpoint `POST :id/test`, query DB lấy config rồi gọi sang `testStateless`, thêm cảnh báo `@deprecated`.
- **Ưu điểm**:
  - Backward compatibility tạm thời cho client.
- **Nhược điểm / Trade-off**:
  - Vẫn phải duy trì logic query DB và DTO, gây rườm rà không cần thiết trong kiến trúc nội bộ.
- **Độ phức tạp**: Thấp.

> **Lựa chọn**: **Option 1 (Direct Clean-up)** được chọn vì hệ thống đang trong quá trình phát triển nội bộ tập trung, cần tinh gọn tối đa.

---

## 4. Proposed Solution & Core Mechanism (Cơ chế Vận hành)

### Architecture & Processing Flow
```
[Client / FE]
      │
      │  (Duy nhất 1 endpoint kiểm thử)
      ▼
POST /data-provider-features/test { type, service, config, input }
      │
      ▼
DataProviderFeatureController.testStateless()
      │
      ▼
FeatureRunnerRegistry.getRunner(type)
      │
      ▼
FeatureRunner.testStateless(service, config, input)
```

- Toàn bộ flow phụ thuộc vào DB (`id -> DataProviderFeatureService.testFeature -> getFeatureWithActiveVersion`) sẽ bị triệt tiêu hoàn toàn.

---

## 5. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

- **Unused DTO / Imports**: Cần rà soát kỹ các file import `TestFeatureContextualRequestDto` hoặc `testFeature` để tránh warning/error lúc build.
- **Frontend Sync**: FE hiện tại còn nhánh `handleRunContextualTest` nên khi chuyển đổi sẽ cần task tiếp theo ở FE để dọn dẹp selector `Contextual / Stateless`.
