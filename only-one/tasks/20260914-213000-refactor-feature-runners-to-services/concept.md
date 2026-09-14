# Concept: Chuyển đổi Feature Runners thành Services & Chuẩn hóa Interface IDataProviderFeatureService

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Trong module `DataProviderModule`, các tác vụ xử lý logic cho từng feature type (`SCRAPING`, `SEARCH`) đang được định danh là các "Runner" (`ScrapingFeatureRunner`, `SearchFeatureRunner`) và đặt trong thư mục `runners/`. Trong khi đó, toàn bộ kiến trúc domain của module (scraper, search, discovery...) đều được tổ chức dưới dạng "Service" đặt tại thư mục `services/` (ví dụ: `data-provider-scraper/`, `data-provider-search/`).
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  - Tồn tại thư mục `runners/` riêng lẻ gây phân mảnh cấu trúc thư mục, thiếu tính đồng nhất với mô hình Service-driven của NestJS.
  - Class `DataProviderFeatureService` hiện đang duy trì hàm helper riêng `getRunner(type)` (lines 43-49) gây dư thừa và không nhất quán với cách các service khác sử dụng map trực tiếp.
  - Tên gọi `IFeatureRunner` mang tính runner/job worker hơn là service component.
- **Nguyên nhân cốt lõi (Root Cause)**: Di sản thiết kế cũ coi các feature execution là "Runner" tách biệt, chưa được quy hoạch đồng bộ vào hệ thống Domain Service.
- **Tác động (Impact / Blast Radius)**:
  - Tăng nhận thức kiến trúc (cognitive overhead) cho lập trình viên khi vừa có khái niệm Runner vừa có Service.
  - Cấu trúc thư mục chưa gom cụm tự nhiên theo chức năng.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**:
  1. Loại bỏ hoàn toàn phương thức `getRunner(type)` trong `DataProviderFeatureService`.
  2. Xây dựng interface chung `IDataProviderFeatureService` (hoặc `IFeatureService`) kế thừa các contract chuẩn hóa cho các feature services (`validateConfig`, `testStateless`, `testContextual`).
  3. Chuyển đổi `ScrapingFeatureRunner` và `SearchFeatureRunner` thành các Service tương ứng (`ScrapingFeatureService`, `SearchFeatureService`) đặt tại thư mục `src/modules/data-provider/services/` (hoặc subfolder `services/data-provider-feature/`).
  4. Xóa bỏ hoàn toàn thư mục `src/modules/data-provider/runners/`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Khai báo interface `IDataProviderFeatureService` trong `src/modules/data-provider/interfaces/`.
  - Đổi tên & chuyển `scraping-feature.runner.ts` $\rightarrow$ `scraping-feature.service.ts` và `search-feature.runner.ts` $\rightarrow$ `search-feature.service.ts`.
  - Cả 2 service đều implement interface chung `IDataProviderFeatureService`.
  - `DataProviderFeatureService` không còn method `getRunner(type)`.
  - Đăng ký và export `DATA_PROVIDER_FEATURE_SERVICE_MAP` (hoặc inject trực tiếp) trong `DataProviderModule`.
  - Toàn bộ unit tests được cập nhật tương ứng và vượt qua 100% build check.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Tạo/cập nhật interface `IDataProviderFeatureService` trong `src/modules/data-provider/interfaces/`.
  - Di chuyển và đổi tên các file trong `src/modules/data-provider/runners/` sang `src/modules/data-provider/services/data-provider-feature/` (hoặc `src/modules/data-provider/services/`).
  - Xóa bỏ hoàn toàn thư mục `src/modules/data-provider/runners/`.
  - Cập nhật `DataProviderFeatureService` để loại bỏ `getRunner()` và cập nhật DI token.
  - Cập nhật `DataProviderModule` để register `ScrapingFeatureService`, `SearchFeatureService` và map provider token.
  - Cập nhật các test spec liên quan.
- **Explicit Out-of-Scope**:
  - Không thay đổi logic thuật toán trích xuất dữ liệu, validate config regex, hay logic scraping/search bên trong services.
  - Không thay đổi các HTTP REST endpoints, Swagger specs, hay DTO request/response.

---

## 3. Solution Options & Trade-offs (Giải pháp & Đánh đổi)

### Option 1: Gom cụm theo Subfolder `services/data-provider-feature/` + DI Provider Map (Recommended)
- **Mô tả**:
  - Đặt các service vào `src/modules/data-provider/services/data-provider-feature/`:
    - `scraping-feature.service.ts` (implement `IDataProviderFeatureService`)
    - `search-feature.service.ts` (implement `IDataProviderFeatureService`)
  - Định nghĩa token `DATA_PROVIDER_FEATURE_SERVICE_MAP` trong `constants/`.
  - `DataProviderFeatureService` inject `DATA_PROVIDER_FEATURE_SERVICE_MAP` (hoặc inject trực tiếp cả 2 service nếu muốn) và loại bỏ helper `getRunner()`.
- **Ưu điểm**:
  - Cấu trúc thư mục hoàn toàn đồng bộ với `services/data-provider-scraper/` và `services/data-provider-search/`.
  - Xóa sạch thư mục `runners/`, thống nhất 100% thuật ngữ "Service".
  - Code trong `DataProviderFeatureService` gọn gàng, truy cập map trực tiếp.
- **Nhược điểm**: Cần cập nhật path import trong một số file liên quan.
- **Độ phức tạp**: Thấp (Low).

### Option 2: Đặt phẳng trực tiếp trong `src/modules/data-provider/services/`
- **Mô tả**: Đặt `scraping-feature.service.ts` và `search-feature.service.ts` ngay tại root thư mục `services/`.
- **Ưu điểm**: Không cần tạo thêm thư mục con.
- **Nhược điểm**: Thư mục `services/` bị phình to và không đồng nhất với cấu trúc phân nhóm con như `data-provider-scraper/` và `data-provider-search/`.
- **Độ phức tạp**: Thấp (Low).

---

## 4. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### 4.1 Interface Contract (`IDataProviderFeatureService`)
```typescript
// src/modules/data-provider/interfaces/data-provider-feature-service.interface.ts
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../enums';
import { FeatureTestInput, TargetConfig } from './target-config.interface';

export interface IDataProviderFeatureService<
    TConfig = TargetConfig,
    TInput = FeatureTestInput,
    TResult = unknown,
> {
    validateConfig(config: unknown): TConfig;
    testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
    testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
}
```

### 4.2 Services Implementation
- `ScrapingFeatureService` implements `IDataProviderFeatureService<IScrapingTargetConfig, FeatureTestInput, IExtractDataResponse | ValidateParserFunctionResponseDto>`
- `SearchFeatureService` implements `IDataProviderFeatureService<ISearchTargetConfig, FeatureTestInput, ISearchExtractDataResponse>`

### 4.3 DI Token & Provider Registration
```typescript
export const DATA_PROVIDER_FEATURE_SERVICE_MAP = 'DataProviderFeatureServiceMap';

// Trong DataProviderModule:
{
    provide: DATA_PROVIDER_FEATURE_SERVICE_MAP,
    useFactory: (
        scrapingFeatureService: ScrapingFeatureService,
        searchFeatureService: SearchFeatureService,
    ): Record<string, IDataProviderFeatureService> => ({
        [DataProviderFeatureType.SCRAPING]: scrapingFeatureService,
        [DataProviderFeatureType.SEARCH]: searchFeatureService,
    }),
    inject: [ScrapingFeatureService, SearchFeatureService],
}
```

### 4.4 DataProviderFeatureService Consumption (Loại bỏ `getRunner`)
```typescript
@Inject(DATA_PROVIDER_FEATURE_SERVICE_MAP)
private readonly featureServiceMap: Record<string, IDataProviderFeatureService>,
```
Trong các methods (`createFeature`, `updateFeature`, `switchStatus`, `testStateless`), truy xuất trực tiếp:
```typescript
const featureService = this.featureServiceMap[type];
if (!featureService) throw new AppException(DataProviderError.RunnerNotFound(type));
```

---

## 5. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

- **Import Path Consistency**: Đảm bảo cập nhật mọi nơi import `ScrapingFeatureRunner` / `SearchFeatureRunner` / `IFeatureRunner` sang `ScrapingFeatureService` / `SearchFeatureService` / `IDataProviderFeatureService`.
- **Barrel Exports**: Cập nhật `src/modules/data-provider/interfaces/index.ts` để export interface mới.
- **Unit Test Coverage**: Kiểm tra đầy đủ các test cases của `DataProviderFeatureService`, `ScrapingFeatureService`, `SearchFeatureService`.
