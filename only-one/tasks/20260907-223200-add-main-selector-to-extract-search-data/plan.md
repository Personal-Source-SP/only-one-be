---
status: done
slug: add-main-selector-to-extract-search-data
started_at: 2026-09-07
completed_at: 2026-09-07
pr_url: ~
branch: ~
---

# Plan: Bổ sung Main Content Selector vào ExtractSearchDataHelper

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: `ExtractSearchDataHelper` nhận trực tiếp `htmlContent` thô và chạy hàm `searchData(html)` mà không qua bước tiền xử lý lọc HTML (`transformHtmlContent`) cũng như cắt DOM theo `mainContentSelector` / `isGetParentElement` (`getMainContent`).
- **Điểm nghẽn kỹ thuật**: Cấu hình `mainContentSelector` trong `ISearchTargetConfig` không có tác dụng khi tìm kiếm dữ liệu web, khiến toàn bộ HTML thô bao gồm header/footer/sidebar rác bị nạp vào script trích xuất.
- **Invariants bắt buộc giữ nguyên**:
  - Khi không truyền `mainContentSelector`, hàm vẫn xử lý toàn bộ HTML bình thường.
  - Giữ nguyên cơ chế fallback giữa `searchData` và `extractData`.
  - Giữ nguyên giới hạn `maxResults`.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md)*

- **Type Signatures & Code Contracts**:
  - [target-config.interface.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts#L55-L60): Mở rộng `IRunSearchFunctionExtractData` với `mainContentSelector?: string` và `isGetParentElement?: boolean`.
- **AST Seams & Callers**:
  - [generic-data-provider-search.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts#L17-L34): Lấy `mainContentSelector, isGetParentElement` từ `targetConfig` truyền vào `runFunctionExtractSearchData`.
  - [extract-search-data.helper.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/extract-search-data.helper.ts#L10-L49): Tích hợp `transformHtmlContent` và `getMainContent` vào `runFunctionExtractSearchData`.
  - [extract-search-data.helper.spec.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/_tests/extract-search-data.helper.spec.ts): Thêm unit test cho `mainContentSelector` và `isGetParentElement`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── interfaces/
│   └── [MODIFY] target-config.interface.ts           # Bổ sung mainContentSelector, isGetParentElement vào IRunSearchFunctionExtractData
├── services/data-provider-search/
│   └── [MODIFY] generic-data-provider-search.service.ts # Truyền mainContentSelector, isGetParentElement từ targetConfig
└── helpers/
    ├── [MODIFY] extract-search-data.helper.ts        # Thêm getMainContent, transformHtmlContent
    └── _tests/
        └── [MODIFY] extract-search-data.helper.spec.ts # Test case cho mainContentSelector & parent element
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/interfaces/target-config.interface.ts` | `IRunSearchFunctionExtractData` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/helpers/extract-search-data.helper.ts` | `ExtractSearchDataHelper.runFunctionExtractSearchData` | `Order 1` | `npx ts-node src/modules/data-provider/helpers/_tests/run-test.ts` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts` | `GenericDataProviderSearchService.getExtractSearchData` | `Order 1, Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/data-provider/helpers/_tests/extract-search-data.helper.spec.ts` | `describe('runFunctionExtractSearchData')` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/interfaces/target-config.interface.ts`
> **Action**: Mở rộng `IRunSearchFunctionExtractData` với `mainContentSelector` và `isGetParentElement`.

```diff
@@ -58,2 +58,4 @@
     resultSelector?: string;
     maxResults?: number;
+    mainContentSelector?: string;
+    isGetParentElement?: boolean;
 }
```

### 2. `[MODIFY]` `src/modules/data-provider/helpers/extract-search-data.helper.ts`
> **Action**: Bổ sung `transformHtmlContent` và `getMainContent` vào `ExtractSearchDataHelper`.

```diff
@@ -10,3 +10,3 @@
     async runFunctionExtractSearchData(dto: IRunSearchFunctionExtractData): Promise<SearchResultItemDto[]> {
-        const { functionGenerator, htmlContent, resultSelector, maxResults } = dto;
+        const { functionGenerator, htmlContent, resultSelector, maxResults, mainContentSelector, isGetParentElement } = dto;
 
@@ -33,3 +33,12 @@
             )(cheerio, resultSelector || '');
 
-            const result = runFn(htmlContent);
+            const htmlContentTransformed = this.transformHtmlContent(htmlContent);
+            const mainContent = this.getMainContent({
+                html: htmlContentTransformed,
+                options: { mainContentSelector, isChildren: isGetParentElement },
+            });
+            if (!mainContent) {
+                throw new Error(`Main content not found for selector: ${mainContentSelector}`);
+            }
+
+            const result = runFn(mainContent);
@@ -95,2 +104,26 @@
     }
+
+    private getMainContent(dto: { html: string; options?: { mainContentSelector?: string; isChildren?: boolean } }): string {
+        const { html, options } = dto;
+
+        if (!options?.mainContentSelector) return html;
+
+        try {
+            const $ = cheerio.load(html);
+            const mainContent = options?.isChildren ? $(options.mainContentSelector).parent() : $(options.mainContentSelector);
+
+            const outterHTML = mainContent.length > 0 ? $.html(mainContent.get(0)) : $.html(mainContent);
+            return outterHTML || '';
+        } catch (error) {
+            return null;
+        }
+    }
+
+    private transformHtmlContent(htmlContent: string): string {
+        if (!htmlContent) return '';
+        try {
+            const $ = cheerio.load(htmlContent);
+            const bodyContent = $('html');
+
+            bodyContent.find('style').remove();
+            bodyContent.find('link[rel="icon"]').remove();
+            bodyContent.find('link[rel="stylesheet"]').remove();
+
+            return bodyContent.html() ? bodyContent.html().replace(/\n/g, '').trim() : htmlContent;
+        } catch (error) {
+            return htmlContent;
+        }
+    }
```

### 3. `[MODIFY]` `src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts`
> **Action**: Truyền `mainContentSelector` và `isGetParentElement` từ `targetConfig` vào `runFunctionExtractSearchData`.

```diff
@@ -17,2 +17,2 @@
-        const { functionGenerator, resultSelector, maxResults } = targetConfig;
+        const { functionGenerator, resultSelector, maxResults, mainContentSelector, isGetParentElement } = targetConfig;
 
@@ -33,2 +33,4 @@
                 maxResults,
+                mainContentSelector,
+                isGetParentElement,
             });
```

### 4. `[MODIFY]` `src/modules/data-provider/helpers/_tests/extract-search-data.helper.spec.ts`
> **Action**: Bổ sung unit test kiểm tra `mainContentSelector` và `isGetParentElement`.

```diff
@@ -75,2 +75,44 @@
         });
+
+        it('should filter HTML by mainContentSelector before running searchData', async () => {
+            const functionGenerator = `
+                const searchData = (html) => {
+                    const $ = cheerio.load(html);
+                    const items = [];
+                    $('a.item').each((_, el) => {
+                        items.push({ url: $(el).attr('href') });
+                    });
+                    return items;
+                };
+            `;
+            const htmlContent = '<html><body><header><a class="item" href="/header-link">Nav</a></header><div id="results"><a class="item" href="/p1">Product 1</a></div></body></html>';
+
+            const result = await helper.runFunctionExtractSearchData({
+                functionGenerator,
+                htmlContent,
+                mainContentSelector: '#results',
+            });
+
+            expect(result).toEqual([{ url: '/p1' }]);
+        });
+
+        it('should extract parent element when isGetParentElement is true', async () => {
+            const functionGenerator = `
+                const searchData = (html) => {
+                    const $ = cheerio.load(html);
+                    const items = [];
+                    $('a.item').each((_, el) => {
+                        items.push({ url: $(el).attr('href') });
+                    });
+                    return items;
+                };
+            `;
+            const htmlContent = '<div class="wrapper"><div class="inner"><a class="item" href="/p1">Product 1</a></div></div>';
+
+            const result = await helper.runFunctionExtractSearchData({
+                functionGenerator,
+                htmlContent,
+                mainContentSelector: '.inner',
+                isGetParentElement: true,
+            });
+
+            expect(result).toEqual([{ url: '/p1' }]);
+        });
```

---

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - [x] TypeScript build check: `npx tsc -p tsconfig.build.json --noEmit` $\rightarrow$ PASS (0 errors)
  - [x] ESLint check: `npx cross-env ESLINT_USE_FLAT_CONFIG=false eslint "src/modules/data-provider/helpers/**/*.ts" "src/modules/data-provider/services/data-provider-search/**/*.ts" "src/modules/data-provider/interfaces/**/*.ts"` $\rightarrow$ PASS (0 errors)
  - [x] Logic Verification:
    - Test 1: Lọc HTML theo `mainContentSelector: '#results'` $\rightarrow$ Chỉ trích xuất phần tử trong `#results`.
    - Test 2: Lấy outer parent khi `isGetParentElement: true` $\rightarrow$ Trích xuất đúng phần tử cha bọc ngoài.
    - Test 3: Fallback khi không có `mainContentSelector` $\rightarrow$ Trích xuất toàn bộ trang bình thường.
    $\rightarrow$ **ALL EXTRACT SEARCH DATA HELPER TESTS PASSED!**
