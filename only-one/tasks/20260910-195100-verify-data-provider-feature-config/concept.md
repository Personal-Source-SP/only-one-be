# Concept: Cơ Chế Xác Thực Cấu Hình Tính Năng & Chuẩn Hóa Kiểu Dữ Liệu Data Provider Feature (IScrapingTargetConfig & ISearchTargetConfig)

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Khi người dùng hoặc API client gọi các endpoints tạo mới (`POST /data-provider-features/provider/:dataProviderId`), cập nhật cấu hình (`PUT /data-provider-features/:id`), hoặc chạy thử nghiệm không trạng thái (`POST /data-provider-features/test`).
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  - Các trường `config` và `input` trong DTOs (`CreateDataProviderFeatureRequestDto.config`, `UpdateFeatureConfigRequestDto.config`, `TestFeatureStatelessRequestDto.config`) hiện đang dùng kiểu lỏng lẻo `Record<string, unknown>`, `Record<string, any>` hoặc `any` với `@ObjectFieldOptional()`.
  - Trong [DataProviderFeatureEntity](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts) và [ConfigVersionEntity](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/config-version.entity.ts), trường `config` đang để `Record<string, any>`, làm mất tính type-safety tại tầng ORM và domain model.
  - Tên interface cũ `ITargetConfig` mang tính chung chung không rõ ràng cho Scraping, trong khi `ISearchTargetConfig` đã tách riêng.
  - Các generics và signatures của `IFeatureRunner`, `ScrapingFeatureRunner`, `SearchFeatureRunner`, `ExtractSearchDataHelper`, `ExtractDataHelper` đang dùng nhiều `any` (`TConfig = any, TInput = any, TResult = any`, `input?: any`, `data: Record<string, any>`).
  - Không có tầng xác thực cấu trúc (schema validation) cũng như ngữ nghĩa (semantic / syntax validation) cho `config` trước khi lưu vào database hoặc đưa vào `FeatureRunner`.
  - Trong [DataProviderFeatureService](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts), nếu client không truyền `input`, hệ thống lưu thẳng payload `config` không hợp lệ (ví dụ: thiếu `functionGenerator`, sai định dạng `cookies`, `searchUrlPattern` không hợp lệ...) và gắn trạng thái `UNCONFIGURED`, dẫn đến cấu hình hỏng (corrupted config) trong database.
- **Nguyên nhân cốt lõi (Root Cause)**:
  - Thiếu hợp đồng xác thực (validation contract) trong kiến trúc `IFeatureRunner` / `FeatureRunnerRegistry`.
  - Tên gọi interface `ITargetConfig` chưa được chuyên biệt hóa cho tính năng `SCRAPING` (`IScrapingTargetConfig`), và lạm dụng `any` / `Record<string, any>`.
- **Tác động (Impact / Blast Radius)**:
  - Dữ liệu cấu hình rác/hỏng có thể bị persist vào DB và tạo snapshot trong `ConfigVersionEntity`.
  - Khi worker hoặc scheduler kích hoạt cào dữ liệu / tìm kiếm, runner sẽ crash runtime với lỗi unhandled exception hoặc JavaScript VM `SyntaxError`.
  - Mất hoàn toàn sự bảo vệ của TypeScript compiler tại các tầng trung gian (Controller, Service, Runner, Fetcher).

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**:
  1. Đổi tên `ITargetConfig` thành `IScrapingTargetConfig` tường minh cho Scraping, giữ nguyên `ISearchTargetConfig` cho Search, và định nghĩa `TargetConfig = IScrapingTargetConfig | ISearchTargetConfig` cho polymorphic contexts.
  2. Chuẩn hóa interface cho test payload: `FeatureTestInput`.
  3. Xây dựng cơ chế verify cấu hình bắt buộc và toàn diện trước khi thực thi hoặc lưu trữ trong `DataProviderFeatureService`.
  4. Type-safety 100% (Zero any) xuyên suốt từ Request DTOs, Service, Entity ([DataProviderFeatureEntity](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts), [ConfigVersionEntity](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/config-version.entity.ts)), Response DTOs ([DataProviderFeatureDto](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/data-provider-feature.dto.ts)) đến Runner Engine.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - `IScrapingTargetConfig` và `ISearchTargetConfig` được định nghĩa rõ ràng; `TargetConfig` là union của cả hai.
  - 100% không còn kiểu `any` tại `target-config.interface.ts`, `feature-runner.interface.ts`, `data-provider-feature.entity.ts`, `config-version.entity.ts`, DTOs và các Runner implementations.
  - `config` được tự động validate theo đúng runner (bắt buộc `functionGenerator` không rỗng, kiểm tra cú pháp JS hợp lệ `new Function(...)`, `retryAttempts` $\ge 0$, `timeout` $> 0$, `cookies` đúng định dạng `name`, `value`, `searchUrlPattern` cho Search).
  - Ném `AppException` với mã lỗi chuẩn hóa trong [DataProviderError](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/constants/data-provider-error.ts) (`InvalidFeatureConfig`) khi validation thất bại (Fail-Fast).

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Đổi tên `ITargetConfig` thành `IScrapingTargetConfig`, giữ `ISearchTargetConfig extends IScrapingTargetConfig`, định nghĩa `TargetConfig` và `FeatureTestInput` trong [target-config.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts).
  - Cập nhật toàn bộ các references trong Backend sang `IScrapingTargetConfig`, `ISearchTargetConfig` và `TargetConfig`.
  - Mở rộng `IFeatureRunner<TConfig, TInput = FeatureTestInput, TResult = unknown>` với `validateConfig(config: unknown): TConfig`.
  - Triển khai `validateConfig` cho `ScrapingFeatureRunner` (trả về `IScrapingTargetConfig`) và `SearchFeatureRunner` (trả về `ISearchTargetConfig`).
  - Xây dựng `TargetConfigValidatorHelper` với `validateScrapingTargetConfig` và `validateSearchTargetConfig` (Zero any).
  - Cập nhật logic `createFeature`, `updateFeatureConfig`, `testStateless` trong [DataProviderFeatureService](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts) và [DataProviderFeatureController](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts).
  - Bổ sung Error Codes tương ứng trong [DataProviderError](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/constants/data-provider-error.ts).

- **Explicit Out-of-Scope**:
  - Không thay đổi cơ chế thực thi sandbox crawler (`HtmlFetcherService`, `ApiFetcherService`, `cheerio`, `puppeteer`).
  - Không thay đổi cấu trúc bảng cơ sở dữ liệu PostgreSQL (cột `config` vẫn giữ kiểu `jsonb`, chỉ thay đổi TypeScript typing tại TypeORM entity).
  - Không thay đổi luồng xử lý worker queue (`DiscoveryValidationWorkerProcessor`, `DiscoveryIngestionWorkerProcessor`).

---

## 3. Proposed Solution & Architecture Trade-offs (Giải pháp Đề xuất & Đánh giá)

### Quyết định Kiến trúc & Cơ chế Cốt lõi (IScrapingTargetConfig, ISearchTargetConfig & Runner Validation)

1. **Type Definitions ([target-config.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts))**:
   ```ts
   export interface CookieItem {
       name: string;
       value: string;
       domain?: string;
       path?: string;
   }

   export interface IScrapingTargetConfig {
       functionGenerator: string; // Hàm xử lý dữ liệu

       mainContentSelector?: string; // Selector lấy nội dung chính
       isGetParentElement?: boolean; // Lấy phần tử cha của nội dung chính

       queryParams?: string; // Tham số truyền vào API
       firstQueryParams?: string; // Tham số truyền vào API

       maxResults?: number; // Số lượng kết quả tối đa
       retryDelay?: number; // Thời gian delay giữa mỗi lần retry (ms)
       retryAttempts?: number; // Số lần thử lại khi có lỗi
       userAgent?: string; // Chuỗi user-agent giả lập cho trình duyệt
       headers?: Record<string, string>; // Các header HTTP bổ sung khi request
       cookies?: Array<CookieItem>; // Các cookie bổ sung khi truy cập trang

       timeout?: number; // Thời gian chờ tối đa cho mỗi request (ms)
       waitForTimeout?: number; // Thời gian chờ tối đa cho waitForSelector (ms)

       stealthMode?: boolean; // Bật chế độ ẩn danh chống bot
       cloudflareBypass?: boolean; // Bật chế độ vượt qua Cloudflare
       waitForSelector?: string; // Chờ selector này xuất hiện trước khi lấy nội dung
       javascriptEnabled?: boolean; // Có bật JavaScript hay không
       imagesEnabled?: boolean; // Có tải ảnh hay không
       cssEnabled?: boolean; // Có tải CSS hay không
   }

   export interface ISearchTargetConfig extends IScrapingTargetConfig {
       searchUrlPattern?: string; // Pattern URL tìm kiếm (e.g. https://example.com/search?q={query})
       queryPlaceholder?: string; // Placeholder thay thế query trong searchUrlPattern (e.g. {query})
       resultSelector?: string; // Selector của từng thẻ sản phẩm/kết quả trong danh sách
   }

   export type TargetConfig = IScrapingTargetConfig | ISearchTargetConfig;

   export interface FeatureTestInput {
       url?: string;
       htmlContentString?: string;
       dataContent?: Record<string, unknown>;
       query?: string;
       itemUrl?: string;
       [key: string]: unknown;
   }
   ```

2. **Runner Contract ([feature-runner.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/feature-runner.interface.ts))**:
   ```ts
   export interface IFeatureRunner<TConfig = TargetConfig, TInput = FeatureTestInput, TResult = unknown> {
       validateConfig(config: unknown): TConfig;
       testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
       testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
   }
   ```

3. **Core Validation Logic ([target-config-validator.helper.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/target-config-validator.helper.ts))**:
   - `validateScrapingTargetConfig(rawConfig: unknown): IScrapingTargetConfig`
   - `validateSearchTargetConfig(rawConfig: unknown): ISearchTargetConfig`
   - `validateConfig(rawConfig: unknown, type: DataProviderFeatureType): TargetConfig`
   - Bắt lỗi an toàn không dùng `any`:
     ```ts
     try {
         new Function('html', 'cheerio', 'axios', config.functionGenerator);
     } catch (error: unknown) {
         const message = error instanceof Error ? error.message : String(error);
         throw new AppException(DataProviderError.InvalidFeatureConfig(`Cú pháp hàm functionGenerator không hợp lệ: ${message}`));
     }
     ```

---

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

1. **Rủi ro Cú pháp `functionGenerator` chứa mã độc / runtime crash**:
   - *Biện pháp*: Syntax validation chỉ biên dịch kiểm tra cấu trúc cú pháp AST / Constructor (`new Function(...)`), không thực thi code trong quá trình validate cấu hình.
2. **Cập nhật config một phần (Partial Config Updates)**:
   - *Biện pháp*: `UpdateFeatureConfigRequestDto.config` là full snapshot của version mới. Runner validate toàn bộ object config để đảm bảo tính toàn vẹn của version snapshot.
3. **Dữ liệu lịch sử đã lưu (Legacy Configs)**:
   - *Biện pháp*: Validation được áp dụng ngay tại entry points create/update/test, bảo đảm mọi config lưu mới hoặc cập nhật đều đạt chuẩn.
