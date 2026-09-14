# Concept: Refactor Feature Runner Registry sang NestJS DI Provider Factory Map

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Trong module `DataProviderModule`, các service scraper và search (`ApiDataProviderScraperService`, `LocalDataProviderScraperService`, `GenericDataProviderScraperService`) đang được đăng ký và inject linh hoạt thông qua NestJS Custom Provider Factory (`DATA_PROVIDER_SCRAPER_SERVICE_MAP` và `DATA_PROVIDER_SEARCH_SERVICE_MAP`). Tuy nhiên, việc dispatch các runner (`ScrapingFeatureRunner`, `SearchFeatureRunner`) lại được quản lý riêng qua một class trung gian `FeatureRunnerRegistry`.
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  - Kiến trúc không đồng nhất (inconsistent pattern): một số map dùng NestJS DI custom provider token, trong khi feature runners lại dùng một class registry riêng biệt.
  - Class `FeatureRunnerRegistry` tạo ra boilerplate class không cần thiết, phát sinh thêm `forwardRef` trong `DataProviderFeatureService` và yêu cầu duy trì unit test riêng cho wrapper class này.
- **Nguyên nhân cốt lõi (Root Cause)**: `FeatureRunnerRegistry` được tạo như một class registry thủ công thay vì tận dụng cơ chế `useFactory` + Injection Token có sẵn của NestJS IoC container.
- **Tác động (Impact / Blast Radius)**:
  - Tăng độ phức tạp khi mở rộng thêm các `DataProviderFeatureType` runner mới.
  - Phụ thuộc circular dependency tiềm ẩn giữa `DataProviderFeatureService` và `FeatureRunnerRegistry`.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**: Chuẩn hóa việc phân giải `IFeatureRunner` theo chuẩn NestJS DI Custom Provider Factory Map (`DATA_PROVIDER_FEATURE_RUNNER_MAP`), loại bỏ class `FeatureRunnerRegistry`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Định nghĩa constant token `DATA_PROVIDER_FEATURE_RUNNER_MAP` trong `src/modules/data-provider/constants/`.
  - Khai báo Custom Provider trong `DataProviderModule` sử dụng `useFactory` nhận các runner (`ScrapingFeatureRunner`, `SearchFeatureRunner`) và trả về `Record<DataProviderFeatureType, IFeatureRunner>`.
  - `DataProviderFeatureService` inject trực tiếp `@Inject(DATA_PROVIDER_FEATURE_RUNNER_MAP)` thay vì `FeatureRunnerRegistry`.
  - Giữ nguyên cơ chế kiểm tra lỗi `AppException(DataProviderError.RunnerNotFound(type))` khi không tìm thấy runner tương ứng.
  - Xóa bỏ class `FeatureRunnerRegistry` và file test `feature-runner.registry.spec.ts`.
  - Cập nhật toàn bộ unit test của `DataProviderFeatureService` để mock token `DATA_PROVIDER_FEATURE_RUNNER_MAP`.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Tạo constant token `DATA_PROVIDER_FEATURE_RUNNER_MAP`.
  - Cấu hình provider `DATA_PROVIDER_FEATURE_RUNNER_MAP` trong `DataProviderModule` (`useFactory` + `inject`).
  - Cập nhật `DataProviderFeatureService` để inject và lấy runner từ `DATA_PROVIDER_FEATURE_RUNNER_MAP`.
  - Xóa file `feature-runner.registry.ts` và `feature-runner.registry.spec.ts`.
  - Cập nhật file test `data-provider-feature.service.spec.ts`.
- **Explicit Out-of-Scope**:
  - Không thay đổi interface `IFeatureRunner` hay logic xử lý bên trong `ScrapingFeatureRunner` và `SearchFeatureRunner`.
  - Không thay đổi các API contracts hay DTOs của Data Provider.
  - Không thay đổi cấu trúc `DATA_PROVIDER_SCRAPER_SERVICE_MAP` hay `DATA_PROVIDER_SEARCH_SERVICE_MAP`.

---

## 3. Solution Options & Trade-offs (Giải pháp & Đánh đổi)

### Option 1: NestJS Custom Provider Factory (Record/Map Token) - (Recommended)
- **Mô tả**: Định nghĩa token `DATA_PROVIDER_FEATURE_RUNNER_MAP` và provider trong `DataProviderModule` mapping `DataProviderFeatureType` với các instances của `IFeatureRunner`.
- **Ưu điểm**:
  - Hoàn toàn đồng nhất với pattern hiện có (`DATA_PROVIDER_SCRAPER_SERVICE_MAP`, `DATA_PROVIDER_SEARCH_SERVICE_MAP`).
  - Loại bỏ hoàn toàn wrapper class và giảm boilerplate code.
  - Dễ dàng mock trong unit test qua `{ provide: DATA_PROVIDER_FEATURE_RUNNER_MAP, useValue: mockRunnerMap }`.
- **Nhược điểm**: Cần thực hiện kiểm tra `!runner` trong `DataProviderFeatureService` trước khi gọi để throw `DataProviderError.RunnerNotFound`.
- **Độ phức tạp**: Thấp (Low).

### Option 2: Giữ nguyên `FeatureRunnerRegistry` nhưng inject dynamic qua `ModuleRef`
- **Mô tả**: Giữ class `FeatureRunnerRegistry` và dùng `ModuleRef.get()` để resolve runner động theo type.
- **Ưu điểm**: Runner có thể lazy load.
- **Nhược điểm**: Mất tính type-safe tĩnh tại compile-time, tăng độ phức tạp, không đồng nhất với kiến trúc module hiện có.
- **Độ phức tạp**: Trung bình (Medium).

---

## 4. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### Core Mechanism
1. **Token Definition**:
   ```typescript
   export const DATA_PROVIDER_FEATURE_RUNNER_MAP = Symbol('DATA_PROVIDER_FEATURE_RUNNER_MAP');
   ```

2. **Module Provider Factory (`DataProviderModule`)**:
   ```typescript
   {
       provide: DATA_PROVIDER_FEATURE_RUNNER_MAP,
       useFactory: (
           scrapingFeatureRunner: ScrapingFeatureRunner,
           searchFeatureRunner: SearchFeatureRunner,
       ): Record<DataProviderFeatureType, IFeatureRunner> => ({
           [DataProviderFeatureType.SCRAPING]: scrapingFeatureRunner,
           [DataProviderFeatureType.SEARCH]: searchFeatureRunner,
       }),
       inject: [ScrapingFeatureRunner, SearchFeatureRunner],
   }
   ```

3. **Service Consumption (`DataProviderFeatureService`)**:
   ```typescript
   @Inject(DATA_PROVIDER_FEATURE_RUNNER_MAP)
   private readonly featureRunnerMap: Record<DataProviderFeatureType, IFeatureRunner>,
   ```
   Helper method trong service:
   ```typescript
   private getRunner(type: DataProviderFeatureType): IFeatureRunner {
       const runner = this.featureRunnerMap[type];
       if (!runner) {
           throw new AppException(DataProviderError.RunnerNotFound(type));
       }
       return runner;
   }
   ```

---

## 5. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

- **Missing Runner Mapping**: Khi thêm một `DataProviderFeatureType` mới mà quên bổ sung vào `useFactory`, hệ thống sẽ throw `RunnerNotFound` đúng chuẩn thông qua helper `getRunner()`.
- **Circular Dependency**: Việc loại bỏ class `FeatureRunnerRegistry` giúp giảm nguy cơ phụ thuộc vòng giữa service và registry; `forwardRef` có thể loại bỏ nếu không còn circular dependency giữa `DataProviderFeatureService` và runners.
- **Unit Test Breakages**: Cần đảm bảo cập nhật đầy đủ các mock provider trong `data-provider-feature.service.spec.ts` để tránh gãy test suite.
