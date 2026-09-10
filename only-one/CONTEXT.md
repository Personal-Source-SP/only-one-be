# Living Domain Glossary (CONTEXT.md)

## Data Provider & Discovery Domain

- **DataProvider (`DataProviderEntity`)**: Đại diện cho một đối tác hoặc nguồn cấp dữ liệu (e.g. website, sàn TMĐT) cung cấp dữ liệu sản phẩm, bài viết hoặc thông tin crawling.
- **DataProviderFeature (`DataProviderFeatureEntity`)**: Một năng lực cụ thể của DataProvider, được định danh qua `DataProviderFeatureType` (`SCRAPING`, `SEARCH`, `DISCOVERY`) và được thực thi bởi một `FeatureRunner` tương ứng.
- **FeatureRunner (`IFeatureRunner`)**: Strategy pattern đóng gói logic kiểm thử (`testStateless`, `testContextual`), thực thi sandbox, và xác thực cấu hình (`validateConfig`) cho từng loại tính năng.
- **TargetConfig (`ITargetConfig`, `ISearchTargetConfig`, `TargetConfigUnion`)**: Cấu hình kỹ thuật của tính năng, bao gồm script trích xuất dữ liệu (`functionGenerator`), URL patterns, HTTP headers, cookies, selectors, timeouts và retry policies.
- **ConfigVersion (`ConfigVersionEntity`)**: Snapshot bất biến lưu lại từng phiên bản cấu hình `config` của một feature khi có thao tác chỉnh sửa thủ công (`MANUAL_EDIT`) hoặc rollback (`ROLLBACK`).
- **FeatureRunnerRegistry (`FeatureRunnerRegistry`)**: Registry tập trung lưu trữ và cung cấp runner tương ứng theo `DataProviderFeatureType`.
- **Stateless Sandbox (`testStateless`)**: Kiểm thử cấu hình tức thì với dữ liệu mẫu đầu vào (`input`) mà không làm thay đổi trạng thái của database hay entity.
