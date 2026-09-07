---
status: done
slug: fix-search-url-placeholder-replacement
started_at: 2026-09-07
completed_at: 2026-09-07
pr_url: ~
branch: ~
---

# Plan: Chuẩn hóa Xử lý Placeholder {query} trong SearchFeatureRunner

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: Trong `search-feature.runner.ts`, phương thức `buildSearchUrl` kiểm tra các placeholder cứng `${query}`, `{keyword}`, `${keyword}`... và khi không tìm thấy chuỗi placeholder trong `searchUrlPattern`, hàm tự động fallback gắn `?q=${encodedQuery}` hoặc `&q=${encodedQuery}`.
- **Điểm nghẽn kỹ thuật**: Khi người dùng cấu hình URL gốc (ví dụ `https://gaigu6.fit/gai-goi/`) và placeholder `{query}`, URL bị gắn sai thành `https://gaigu6.fit/gai-goi/?q=...` thay vì `https://gaigu6.fit/gai-goi/{query}` (hoặc URL path tương ứng).
- **Invariants bắt buộc giữ nguyên**:
  - `input.url` truyền trực tiếp vẫn được ưu tiên trả về ngay nếu có.
  - Pattern rỗng trả về chuỗi rỗng `''`.
  - Giữ nguyên cơ chế URL encoding (`encodeURIComponent`) cho giá trị query.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md; không phát sinh Type Contract mới)*

- **Type Signatures & Code Contracts**:
  - Không thay đổi interface `ISearchTargetConfig` trong `target-config.interface.ts`.
  - Signature `buildSearchUrl(config: ISearchTargetConfig, input?: any): string` giữ nguyên để đảm bảo 100% backward compatibility cho các callers.
- **AST Seams & Callers**:
  - [search-feature.runner.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/search-feature.runner.ts#L14-L46): Phương thức `buildSearchUrl`.
  - [search-feature.runner.spec.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts#L23-L52): Cập nhật unit tests cho `buildSearchUrl`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/runners/
├── [MODIFY] search-feature.runner.ts                 # Chuẩn hóa buildSearchUrl, chỉ match & replace {...}, loại bỏ fallback ?q=
└── _tests/
    └── [MODIFY] search-feature.runner.spec.ts        # Bổ sung test case path-based placeholder & loại bỏ test fallback ?q=
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/search-feature.runner.ts` | `SearchFeatureRunner.buildSearchUrl` | `None` | `npx ts-node -r tsconfig-paths/register src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts` | `describe('buildSearchUrl')` | `Order 1` | `npx ts-node -r tsconfig-paths/register src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/runners/search-feature.runner.ts`
> **Action**: Chuẩn hóa `buildSearchUrl`: Xử lý placeholder định dạng `{...}`, tự động nối placeholder vào URL path nếu URL chưa chứa placeholder và loại bỏ hoàn toàn fallback `?q=`.

```diff
@@ -19,28 +19,30 @@
         const query = (input?.query || config?.sampleQuery || '').trim();
         const pattern = config?.searchUrlPattern?.trim();
 
         if (!pattern) {
             return '';
         }
 
-        if (!query) {
-            return pattern;
-        }
+        const placeholder = config?.queryPlaceholder?.trim() || '{query}';
+        let targetPattern = pattern;
 
-        const placeholder = config?.queryPlaceholder || '{query}';
-        const encodedQuery = encodeURIComponent(query);
-
-        if (pattern.includes(placeholder)) {
-            return pattern.split(placeholder).join(encodedQuery);
+        if (!targetPattern.includes(placeholder)) {
+            const hasAnyPlaceholder = /\{[a-zA-Z0-9_-]+\}/.test(targetPattern);
+            if (!hasAnyPlaceholder) {
+                const cleanPlaceholder = placeholder.startsWith('/') ? placeholder.slice(1) : placeholder;
+                targetPattern = targetPattern.endsWith('/')
+                    ? `${targetPattern}${cleanPlaceholder}`
+                    : `${targetPattern}/${cleanPlaceholder}`;
+            }
         }
 
-        const commonPlaceholders = ['${query}', '{keyword}', '${keyword}', '{q}', '${q}'];
-        for (const ph of commonPlaceholders) {
-            if (pattern.includes(ph)) {
-                return pattern.split(ph).join(encodedQuery);
-            }
+        if (!query) {
+            return targetPattern;
         }
 
-        const separator = pattern.includes('?') ? '&' : '?';
-        return `${pattern}${separator}q=${encodedQuery}`;
+        const encodedQuery = encodeURIComponent(query);
+        if (targetPattern.includes(placeholder)) {
+            return targetPattern.split(placeholder).join(encodedQuery);
+        }
+
+        return targetPattern.replace(/\{[a-zA-Z0-9_-]+\}/g, encodedQuery);
     }
```

### 2. `[MODIFY]` `src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts`
> **Action**: Cập nhật các test case của `buildSearchUrl` để kiểm thử chuẩn hóa placeholder `{...}` và URL path.

```diff
@@ -38,10 +38,26 @@
             expect(url).toBe('https://example.com/search?keyword=%C3%A1o%20thun');
         });
 
-        it('should fallback to appending ?q= when pattern has no placeholder', () => {
+        it('should append placeholder to path when pattern has no placeholder and query is provided', () => {
             const config: ISearchTargetConfig = {
                 functionGenerator: '',
                 searchUrlPattern: 'https://example.com/search',
             };
-            const url = runner.buildSearchUrl(config, { query: 'shoes' });
-            expect(url).toBe('https://example.com/search?q=shoes');
+            const url = runner.buildSearchUrl(config, { query: 'shoes' });
+            expect(url).toBe('https://example.com/search/shoes');
+        });
+
+        it('should return path with placeholder if pattern ends with slash and query is empty', () => {
+            const config: ISearchTargetConfig = {
+                functionGenerator: '',
+                searchUrlPattern: 'https://example.com/categories/',
+                queryPlaceholder: '{query}',
+            };
+            const url = runner.buildSearchUrl(config);
+            expect(url).toBe('https://example.com/categories/{query}');
+        });
+
+        it('should replace query into trailing path when pattern has trailing slash', () => {
+            const config: ISearchTargetConfig = {
+                functionGenerator: '',
+                searchUrlPattern: 'https://example.com/categories/',
+                queryPlaceholder: '{query}',
+            };
+            const url = runner.buildSearchUrl(config, { query: 'shoes' });
+            expect(url).toBe('https://example.com/categories/shoes');
+        });
```

---

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - [x] TypeScript build check: `npx tsc -p tsconfig.build.json --noEmit` $\rightarrow$ PASS (0 errors)
  - [x] ESLint check: `npx cross-env ESLINT_USE_FLAT_CONFIG=false eslint "src/modules/data-provider/runners/**/*.ts"` $\rightarrow$ PASS (0 errors)
  - [x] Logic Assertion Suite:
    - Case 1: `input.url = 'https://example.com/custom'` $\rightarrow$ `https://example.com/custom`
    - Case 2: `searchUrlPattern = 'https://example.com/search?keyword={query}'`, `query = 'áo thun'` $\rightarrow$ `https://example.com/search?keyword=%C3%A1o%20thun`
    - Case 3: `searchUrlPattern = 'https://example.com/search'`, `query = 'shoes'` $\rightarrow$ `https://example.com/search/shoes`
    - Case 4: `searchUrlPattern = 'https://example.com/categories/'`, `queryPlaceholder = '{query}'`, `query = ''` $\rightarrow$ `https://example.com/categories/{query}`
    - Case 5: `searchUrlPattern = 'https://example.com/categories/'`, `queryPlaceholder = '{query}'`, `query = 'shoes'` $\rightarrow$ `https://example.com/categories/shoes`
    - Case 6: `searchUrlPattern = ''` $\rightarrow$ `''`
    $\rightarrow$ **ALL ASSERTIONS PASSED!**
