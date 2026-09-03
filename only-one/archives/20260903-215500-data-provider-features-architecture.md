---
id: 20260903-215500-data-provider-features-architecture
title: Flat Data Provider Entity & Decoupled Pluggable Features Architecture
archived_at: 2026-09-03
status: active
references: []
affected_modules:
  - modules/data-provider
  - migrations
---

# Archive: Flat Data Provider Entity & Decoupled Pluggable Features Architecture

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: Trước đây, `DataProviderEntity` bị phụ thuộc phân cấp cha-con (`parentId`), dẫn đến quan hệ vòng và logic kế thừa cấu hình ngầm định. Ngoài ra, cấu hình scraping/discovery và các chỉ số đo lường bị nhồi nhét trực tiếp vào bảng `data_providers`, gây phình to schema, thiếu vòng đời độc lập cho từng tính năng và trường `service` lưu dạng `string` tự do dễ sinh lỗi chính tả.
- **Giá trị (Value)**: Chuyển đổi `DataProvider` thành entity độc lập phẳng (flat entity), tách rời các tính năng thành quan hệ 1-N `DataProviderFeatureEntity` với lifecycle độc lập, quản lý phiên bản snapshot cô lập (`ConfigVersionEntity`), runner registry chuẩn hóa và kiểu dữ liệu `ScraperServiceEnum` an toàn tuyệt đối ở tầng application (lưu `varchar(50)` ở database).

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Flat Entity Architecture**: Loại bỏ quan hệ cha-con `parent_id`, buộc mỗi nhà cung cấp dữ liệu định danh tường minh ID và baseUrl.
- **Pluggable Feature Entity**: `DataProviderFeatureEntity` (`data_provider_features`) quản lý `type: DataProviderFeatureType`, `service: ScraperServiceEnum` (default `ScraperServiceEnum.GENERIC`), `status: DataProviderFeatureStatus`, và polymorphic `config: jsonb`.
- **Isolated Feature Versioning**: `ConfigVersionEntity` liên kết trực tiếp với `featureId`, cho phép rollback snapshot, đếm phiên bản và theo dõi lịch sử chỉnh sửa độc lập.
- **Strategy Testing Registry**: `IFeatureRunner` với `ScrapingFeatureRunner` và `DiscoveryRunner` đăng ký qua `FeatureRunnerRegistry`, hỗ trợ kiểm thử không trạng thái (`POST /data-provider-features/test`) và kiểm thử ngữ cảnh (`POST /data-provider-features/:id/test`).
- **End-to-End Type Safety**: Đồng bộ `ScraperServiceEnum` qua Request/Response DTOs (`@IsEnum(ScraperServiceEnum)`), Swagger documentation và Service fallbacks.

```mermaid
flowchart TD
    DataProvider[DataProviderEntity (Flat & Independent)] -->|1 : N| Features[DataProviderFeatureEntity]
    Features -->|1 : N| ConfigVersion[ConfigVersionEntity (featureId scoped)]
    Controller[DataProviderFeatureController] --> Registry[FeatureRunnerRegistry]
    Registry --> ScrapingRunner[ScrapingFeatureRunner]
    Registry --> DiscoveryRunner[DiscoveryRunner]
    Controller --> FeatureService[DataProviderFeatureService]
    Controller --> VersionService[ConfigVersionService]
```

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [`src/modules/data-provider/entities/data-provider.entity.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider.entity.ts): Entity phẳng không phụ thuộc cha-con.
- [`src/modules/data-provider/entities/data-provider-feature.entity.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts): Entity tính năng mở rộng với `service: ScraperServiceEnum` và cấu hình JSONB.
- [`src/modules/data-provider/dtos/data-provider-feature.dto.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/data-provider-feature.dto.ts) & [requests DTOs](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts): DTOs có validation `@IsEnum(ScraperServiceEnum)`.
- [`src/modules/data-provider/entities/config-version.entity.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/config-version.entity.ts): Entity lưu trữ snapshot phiên bản cấu hình.
- [`src/modules/data-provider/controllers/data-provider-feature.controller.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts): RESTful API quản lý feature, rollback version và test sandbox.
- [`src/modules/data-provider/services/data-provider-feature.service.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts): Quản lý vòng đời tính năng và theo dõi metric thất bại/thành công.
- [`src/modules/data-provider/services/config-version.service.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/config-version.service.ts): Quản lý snapshot và rollback nguyên tử.
- [`src/modules/data-provider/runners/`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners): Feature runner strategy registry (`FeatureRunnerRegistry`, `ScrapingFeatureRunner`, `DiscoveryRunner`).

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Trạng thái Test**: 100% Passed (`npm run build` exit code 0, ESLint clean).
