# Walkthrough: Triển khai Search Feature Runner cho Data Provider

Đã triển khai thành công `SearchFeatureRunner` hỗ trợ đầy đủ cho `DataProviderFeatureType.SEARCH`, giải quyết dứt điểm lỗi `RunnerNotFound` và cho phép test/thực thi sandbox tìm kiếm dữ liệu.

---

## 1. Tóm tắt các Thay đổi Mã nguồn (Changes Applied)

### 1.1. Interface & Contract
- [target-config.interface.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts): Bổ sung interface `ISearchTargetConfig` kế thừa từ `ITargetConfig` với các thuộc tính:
  - `searchUrlPattern`: Pattern URL tìm kiếm (ví dụ: `https://example.com/search?keyword={query}`).
  - `queryPlaceholder`: Ký tự đại diện thay thế (ví dụ: `{query}`, `${query}`, `{keyword}`).
  - `resultSelector`: Selector cho từng thẻ item/card kết quả tìm kiếm.
  - `sampleQuery`: Query mẫu tự động phục vụ test khi kích hoạt feature.

### 1.2. Core Feature Runner
- [search-feature.runner.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts): Tạo mới `SearchFeatureRunner` triển khai interface `IFeatureRunner<ISearchTargetConfig>`:
  - `buildSearchUrl`: Xử lý sinh Search URL động với `encodeURIComponent`, hỗ trợ các placeholder tùy biến `{query}`, `${query}`, `{keyword}`, query param appending (`?q=` / `&q=`) hoặc sử dụng trực tiếp `input.url`.
  - `testStateless`: Thực thi test sandbox không lưu trạng thái qua Scraper Service (`generic`, `local`, `api`).
  - `testContextual`: Thực thi test tính năng đã lưu với cấu hình từ cơ sở dữ liệu.

### 1.3. Registry & Dependency Injection
- [feature-runner.registry.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/runners/feature-runner.registry.ts): Inject `SearchFeatureRunner` và đăng ký ánh xạ `DataProviderFeatureType.SEARCH -> searchRunner`.
- [data-provider.module.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/data-provider.module.ts): Thêm `SearchFeatureRunner` vào danh sách `runners` và `providers` của `DataProviderModule`.

### 1.4. Automated Unit Testing
- [search-feature.runner.spec.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts): Test suites kiểm tra `buildSearchUrl`, `testStateless`, `testContextual`, các trường hợp ngoại lệ và fallback.
- [feature-runner.registry.spec.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/runners/_tests/feature-runner.registry.spec.ts): Test suites xác thực phân phối runner chính xác cho cả `SCRAPING` và `SEARCH`.

---

## 2. Kết quả Kiểm thử & Xác thực (Verification Results)

### 2.1. Linter & Typecheck
- **ESLint**:
  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/modules/data-provider/runners/search-feature.runner.ts src/modules/data-provider/runners/feature-runner.registry.ts src/modules/data-provider/data-provider.module.ts src/modules/data-provider/interfaces/target-config.interface.ts src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts src/modules/data-provider/runners/_tests/feature-runner.registry.spec.ts
  ```
  *Kết quả*: **0 errors, 0 warnings** (Passed).

- **TypeScript Compilation & Build**:
  ```bash
  npm run build
  ```
  *Kết quả*: **Exit Code 0** (Passed clean build).

---

## 3. Hướng dẫn Kiểm tra Thực tế (Sandbox API Verification)

Bạn có thể gọi trực tiếp endpoint `POST /data-provider-features/test` với payload mẫu:

```json
{
  "type": "SEARCH",
  "service": "generic",
  "config": {
    "searchUrlPattern": "https://gaigu6.fit/gai-goi/sai-gon",
    "queryPlaceholder": "",
    "mainContentSelector": "#product-grid",
    "resultSelector": "#product-card",
    "isGetParentElement": false,
    "functionGenerator": "const searchData = (html) => { const $ = cheerio.load(html); try { const productElements = $('#product-card'); const results = []; productElements.each((_, el) => { const $el = $(el); results.push({ url: $el.find('a').attr('href') || '', title: $el.find('.product-title').text().trim() || '' }); }); return results; } catch (e) { return null; } };"
  },
  "input": {
    "query": "ao-thun"
  }
}
```

Hệ thống sẽ thực thi trích xuất dữ liệu và trả về kết quả mượt mà, không còn gặp lỗi `RunnerNotFound`.
