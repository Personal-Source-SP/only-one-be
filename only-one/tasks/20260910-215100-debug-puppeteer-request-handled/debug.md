# Debug: Lỗi Puppeteer "Error: Request is already handled!" khi chặn Images/CSS

---
status: fixed
slug: puppeteer-request-handled
started_at: 2026-09-10 21:51:00
completed_at: 2026-09-10 21:53:00
reproduction_test: npx ts-node -r tsconfig-paths/register src/shared/services/_tests/html-fetcher.service.spec.ts
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Stack Trace**:
  Khi gọi API endpoint `/api/v1/data-provider-features/test` (hoặc thực thi scraping với target config tắt cả images và css: `imagesEnabled: false`, `cssEnabled: false`), quá trình test bị lỗi và ném ra ngoại lệ:
  ```text
  D:\Sources\PERSONAL\only-one-be\node_modules\puppeteer-core\src\util\assert.ts:19
      throw new Error(message);
            ^
  Error: Request is already handled!
      at assert (D:\Sources\PERSONAL\only-one-be\node_modules\puppeteer-core\src\util\assert.ts:19:11)
      at CdpHTTPRequest.verifyInterception (D:\Sources\PERSONAL\only-one-be\node_modules\puppeteer-core\src\api\HTTPRequest.ts:389:11)
      at CdpHTTPRequest.continue (D:\Sources\PERSONAL\only-one-be\node_modules\puppeteer-core\src\api\HTTPRequest.ts:428:10)
      at D:\Sources\PERSONAL\only-one-be\src\shared\services\html-fetcher.service.ts:243:33
      at D:\Sources\PERSONAL\only-one-be\node_modules\puppeteer-core\src\api\Page.ts:778:18
      at CdpHTTPRequest.finalizeInterceptions (D:\Sources\PERSONAL\only-one-be\node_modules\puppeteer-core\src\api\HTTPRequest.ts:258:5)
  ```
- **Red Test Case**:
  File [src/shared/services/_tests/html-fetcher.service.spec.ts](file:///d:/Sources/Personal/only-one-be/src/shared/services/_tests/html-fetcher.service.spec.ts) mô phỏng `configurePage()` với `imagesEnabled: false` và `cssEnabled: false`. Khi event `request` được kích hoạt cho một tài nguyên chung (ví dụ `document`), cả hai listener đều được gọi, dẫn đến listener thứ hai gọi `req.continue()` trên request đã xử lý và gây ra `Error: Request is already handled!`.
- **Lệnh chạy tái hiện**:
  `npx ts-node -r tsconfig-paths/register src/shared/services/_tests/html-fetcher.service.spec.ts` (Exit code: 1 - Failed / RED).

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  Trong [src/shared/services/html-fetcher.service.ts](file:///d:/Sources/Personal/only-one-be/src/shared/services/html-fetcher.service.ts#L226-L246), phương thức `configurePage()` đăng ký 2 request listeners riêng biệt trên cùng `page.on('request', ...)`:
  1. Block 1: Nếu `imagesEnabled === false` $\rightarrow$ gọi `setRequestInterception(true)` và gán listener 1 (nếu không phải image thì gọi `req.continue()`).
  2. Block 2: Nếu `cssEnabled === false` $\rightarrow$ gọi `setRequestInterception(true)` và gán listener 2 (nếu không phải stylesheet thì gọi `req.continue()`).
  
  Theo cơ chế nội bộ của Puppeteer (`HTTPRequest` / `CdpHTTPRequest`), mỗi HTTP request chỉ được phép resolve interception đúng một lần (`continue()`, `abort()`, hoặc `respond()`). Khi một request không phải image được gửi tới:
  - Listener 1 nhận request $\rightarrow$ gọi `req.continue()`, đánh dấu `this.#interceptionHandled = true`.
  - EventEmitter tiếp tục truyền request đó sang Listener 2 $\rightarrow$ Listener 2 kiểm tra không phải stylesheet $\rightarrow$ tiếp tục gọi `req.continue()`.
  - Puppeteer phát hiện request đã được resolve (`verifyInterception`) và ném ra `assert(false, 'Request is already handled!')`.
- **Bằng chứng & Dữ liệu thực nghiệm (Evidence)**:
  - Stack trace chỉ rõ lỗi phát sinh chính xác tại `html-fetcher.service.ts:243:33` (dòng gọi `req.continue()` của CSS listener).
  - Reproduction test xác nhận `Registered request listeners count: 2` và ngay khi một request đi qua cả hai listener, listener thứ 2 ném exception `Error: Request is already handled!`.
- **Invariants bị vi phạm**:
  - *Puppeteer Request Interception Idempotency*: Mỗi request bị intercept chỉ được phép gọi một action resolution (`abort()` / `continue()`) duy nhất. Không được đăng ký nhiều listeners độc lập cùng xử lý nhánh fallback `req.continue()`.
  - *Interception State Check*: Không kiểm tra `req.isInterceptResolutionHandled()` trước khi gọi resolution, và không gom logic lọc resource thành một interceptor tập trung duy nhất.
- **Chiến lược khắc phục dự kiến (Proposed Fix Strategy)**:
  1. Gom toàn bộ logic chặn tài nguyên (images, stylesheets) vào **một single request listener duy nhất** trong `configurePage()`.
  2. Bật `page.setRequestInterception(true)` duy nhất 1 lần khi có ít nhất một rule chặn được kích hoạt (`imagesEnabled === false || cssEnabled === false`).
  3. Trong handler, kiểm tra phòng thủ `if (typeof req.isInterceptResolutionHandled === 'function' && req.isInterceptResolutionHandled()) return;` để tương thích hoàn toàn với các plugin khác (như `AdblockerPlugin`).
  4. Bổ sung `.catch(() => {})` cho `req.abort()` / `req.continue()` để tránh unhandled promise rejections khi browser/page đóng đột ngột hoặc request bị hủy trước bởi CDP.

---
*(🛑 Điểm dừng Review: Người dùng phê duyệt Section 1 & 2 trước khi chuyển sang Section 3 & 4)*
---

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
src/shared/services/
├── [MODIFY] html-fetcher.service.ts         # Surgical patch: gom request interception thành single listener
└── [NEW]    _tests/html-fetcher.service.spec.ts # Regression test suite
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/shared/services/_tests/html-fetcher.service.spec.ts` | `describe('reproduction')...` | `None` | `npx ts-node -r tsconfig-paths/register src/shared/services/_tests/html-fetcher.service.spec.ts` |
| **2** | `[x]` | `[MODIFY]` | `src/shared/services/html-fetcher.service.ts` | `HtmlFetcherService.configurePage` | `Order 1` | `npx ts-node -r tsconfig-paths/register src/shared/services/_tests/html-fetcher.service.spec.ts` |

## Section 4. Code Changes (Unified Diff)
### 1. `[NEW]` `src/shared/services/_tests/html-fetcher.service.spec.ts`
> **Action**: Thêm test case tái hiện lỗi và chống hồi quy (Regression Guard).
```diff
+import assert from 'assert';
+import { EventEmitter } from 'events';
+import { HtmlFetcherService } from '../html-fetcher.service';
+
+class MockHTTPRequest { ... }
+class MockPage extends EventEmitter { ... }
+async function runTests() { ... }
+runTests();
```

### 2. `[MODIFY]` `src/shared/services/html-fetcher.service.ts`
> **Action**: Áp dụng bản vá tối giản (Surgical Minimal Patch).
```diff
@@ -226,22 +226,17 @@
-        if (imagesEnabled === false) {
-            await page.setRequestInterception(true);
-            page.on('request', (req) => {
-                if (req.resourceType() === 'image') {
-                    req.abort();
-                } else {
-                    req.continue();
-                }
-            });
-        }
-
-        if (cssEnabled === false) {
-            await page.setRequestInterception(true);
-            page.on('request', (req) => {
-                if (req.resourceType() === 'stylesheet') {
-                    req.abort();
-                } else {
-                    req.continue();
-                }
-            });
-        }
+        const shouldBlockImages = imagesEnabled === false;
+        const shouldBlockCss = cssEnabled === false;
+
+        if (shouldBlockImages || shouldBlockCss) {
+            await page.setRequestInterception(true);
+            page.on('request', (req) => {
+                if (typeof req.isInterceptResolutionHandled === 'function' && req.isInterceptResolutionHandled()) {
+                    return;
+                }
+                const resourceType = req.resourceType();
+                if ((shouldBlockImages && resourceType === 'image') || (shouldBlockCss && resourceType === 'stylesheet')) {
+                    req.abort().catch(() => {});
+                } else {
+                    req.continue().catch(() => {});
+                }
+            });
+        }
```

## Section 5. Verification & Regression Guard
- **Automated Tests**:
  - `npx ts-node -r tsconfig-paths/register src/shared/services/_tests/html-fetcher.service.spec.ts`: `PASS (Green)`
  - `npx tsc -p tsconfig.build.json`: `PASS (Green, Exit Code 0)`
- **Bài học kinh nghiệm (Lessons Learned)**:
  - Bổ sung quy tắc âm vào `only-one/rules.md`:
    - **[AVOID]** Registering multiple separate request interception listeners (`page.on('request')`) in Puppeteer — Puppeteer requires each intercepted request to be resolved (`continue()`, `abort()`) exactly once; multiple listeners trigger `Error: Request is already handled!`. Always consolidate resource blocking into a single handler and guard with `req.isInterceptResolutionHandled()`.
