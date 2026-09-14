# Living Domain Glossary (CONTEXT.md)

## Data Provider & Discovery Domain

- **DataProvider (`DataProviderEntity`)**: Đại diện cho một đối tác hoặc nguồn cấp dữ liệu (e.g. website, sàn TMĐT) cung cấp dữ liệu sản phẩm, bài viết hoặc thông tin crawling.
- **DataProviderFeature (`DataProviderFeatureEntity`)**: Một năng lực cụ thể của DataProvider, được định danh qua `DataProviderFeatureType` (`SCRAPING`, `SEARCH`, `DISCOVERY`) và được thực thi bởi một `FeatureRunner` tương ứng.
- **FeatureRunner (`IFeatureRunner`)**: Strategy pattern đóng gói logic kiểm thử (`testStateless`, `testContextual`), thực thi sandbox, và xác thực cấu hình (`validateConfig`) cho từng loại tính năng.
- **TargetConfig (`ITargetConfig`, `ISearchTargetConfig`, `TargetConfigUnion`)**: Cấu hình kỹ thuật của tính năng, bao gồm script trích xuất dữ liệu (`functionGenerator`), URL patterns, HTTP headers, cookies, selectors, timeouts và retry policies.
- **ConfigVersion (`ConfigVersionEntity`)**: Snapshot bất biến lưu lại từng phiên bản cấu hình `config` của một feature khi có thao tác chỉnh sửa thủ công (`MANUAL_EDIT`) hoặc rollback (`ROLLBACK`).
- **FeatureRunnerRegistry (`FeatureRunnerRegistry`)**: Registry tập trung lưu trữ và cung cấp runner tương ứng theo `DataProviderFeatureType`.
- **Stateless Sandbox (`testStateless`)**: Kiểm thử cấu hình tức thì với dữ liệu mẫu đầu vào (`input`) mà không làm thay đổi trạng thái của database hay entity.
- **DiscoveryUrl (`DiscoveryUrlEntity`)**: Đại diện cho một URL được khám phá trong `DiscoverySession`. Chứa mã định danh `code` (required), trạng thái xử lý, điểm tin cậy (`confidenceScore`), và `metadata` (JSONB) lưu trữ dữ liệu trích xuất bổ sung. Có liên kết trực tiếp tới `ItemEntity` (ManyToOne).
- **Item (`ItemEntity`)**: Thực thể sản phẩm chuẩn (Canonical Product/Item) trong hệ thống, quản lý định danh duy nhất qua `code` (required & unique), `mappingStatus`, `tags`, và `metadata` (JSONB). Có quan hệ OneToMany tới `DataProviderItemEntity` và `DiscoveryUrlEntity`.
- **DiscoveryRunner (`DiscoveryRunner`)**: Runner nền điều phối tác vụ tìm kiếm, cào dữ liệu URL thông qua Search Feature và khởi chạy quy trình tự động thẩm định (Validation Batch).

## Setting & User Preferences Domain

- **Setting (`SettingEntity`)**: Thực thể lưu trữ cấu hình hệ thống hoặc cấu hình cá nhân dạng JSONB (`key`, `value`, `type`, `isActive`, `userId`).
- **SettingType (`SettingType`)**: Định danh phạm vi của cấu hình (`GLOBAL` cho toàn hệ thống, `USER` cho từng tài khoản cá nhân).
- **ThemePalette (`HubThemePalette`)**: Tông màu giao diện được cá nhân hóa cho từng người dùng, hỗ trợ đồng bộ đa thiết bị (multi-device sync) kết hợp SWR caching trên client.
