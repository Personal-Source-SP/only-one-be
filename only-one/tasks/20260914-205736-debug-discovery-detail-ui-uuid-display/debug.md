# Debug: UI Trang Chi Tiết Khám Phá Hiển Thị Chuỗi UUID Thay Vì Thông Tin Thân Thiện

---
status: fixed
slug: debug-discovery-detail-ui-uuid-display
started_at: 2026-09-14 20:57:36
completed_at: 2026-09-14 21:01:10
reproduction_test: npx tsc --noEmit
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Hành vi sai lệch**:
  1. Trên thanh điều hướng Breadcrumb và tiêu đề trang Header tại `src/components/layout/section-tabs/index.tsx`, hệ thống hiển thị chuỗi UUID thô của phiên (`05ea5fbe-6f99-4dde-aa72-83505a0cbf50 [CHI TIẾT]`) thay vì nhãn điều hướng thân thiện ("Chi tiết").
  2. Tại thẻ thông tin Nhà cung cấp (`SessionOverviewCard.tsx`), tên nhà cung cấp hiển thị dấu gạch ngang rỗng `—` kèm chuỗi `ID: 54e4d092-12ae-4c23-8e9e-176601dceb72` gây nhiễu UI.
- **Red State Reproduction**:
  - Truy cập URL `/scraping/discovery/:id` (ví dụ: `/scraping/discovery/05ea5fbe-6f99-4dde-aa72-83505a0cbf50`).
  - Dữ liệu `session.dataProvider` trả về từ API backend `GET /discovery-sessions/:id` bị `undefined`, dẫn đến fallback `—` và hiển thị raw UUID.
  - Hàm `getSectionBreadcrumbs(pathname)` tại `src/libs/layout-helper.ts` trực tiếp trích xuất segment cuối từ URL (vốn là UUID) làm label của breadcrumb và title của PageHeader.
- **Lệnh kiểm tra type safety & build**: `npx tsc --noEmit` (frontend) và `npx tsc --project tsconfig.build.json --noEmit` (backend).

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  1. **Frontend Breadcrumb / Header**:
     Trong `src/libs/layout-helper.ts:L67`:
     ```typescript
     subSegments.forEach((segment, idx) => {
         breadcrumbs.push({
             key: `sub-${idx}-${segment}`,
             label: decodeURIComponent(segment), // <-- Gán trực tiếp chuỗi UUID làm label
         });
     });
     ```
     `SectionTabLayout` sử dụng `lastItem.label` làm `currentTitle` của PageHeader, dẫn đến việc UUID hiển thị trên cả Breadcrumb và Header Card.
  2. **Backend API `GET /discovery-sessions/:id` thiếu relations**:
     `DiscoverySessionController` kế thừa `BaseController.getById`, gọi `discoverySessionService.findById(id)`. Do `DiscoverySessionService` không override `findById` với `{ relations: { dataProvider: true } }`, TypeORM chỉ thực hiện `SELECT` trên bảng `discovery_sessions` mà không load quan hệ `dataProvider`.
  3. **Frontend Overview Card Metric**:
     Trong `src/app/(root)/scraping/discovery/[id]/components/SessionOverviewCard.tsx:L145`, thẻ metric nhà cung cấp hardcode việc hiển thị raw UUID:
     ```tsx
     <CustomTypography.Text className="font-mono text-xs text-hub-subtitle">
         ID: {session?.dataProviderId || '—'}
     </CustomTypography.Text>
     ```
- **Invariants bị vi phạm**:
  - Giao diện người dùng (User Interface) không được hiển thị các chuỗi UUID kỹ thuật thô cho người dùng cuối ở các vị trí tiêu đề, breadcrumb và thẻ tóm tắt khi đã có các thông tin nghiệp vụ định danh (`sessionCode`, `name`, `identifier`, `baseUrl`).
  - Endpoint chi tiết thực thể `GET /discovery-sessions/:id` phải tự động nạp quan hệ `dataProvider` để cung cấp đầy đủ ngữ cảnh cho client.
- **Chiến lược khắc phục dự kiến (Proposed Fix Strategy)**:
  1. **Backend**: Override `findById` trong `DiscoverySessionService` để mặc định load `relations: { dataProvider: true }`.
  2. **Frontend `layout-helper.ts`**: Kiểm tra nếu `segment` là định dạng UUID (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`), chuyển đổi nhãn hiển thị thành `'Chi tiết'` thay vì hiển thị chuỗi UUID thô.
  3. **Frontend `SessionOverviewCard.tsx`**: Cập nhật thẻ Nhà cung cấp để hiển thị `session?.dataProvider?.name` (hoặc `session?.dataProvider?.identifier`) và phụ đề là `session?.dataProvider?.baseUrl` (hoặc `@${session.dataProvider.identifier}`), loại bỏ dòng `ID: <uuid>`.

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
only-one-be/
└── src/modules/data-provider/services/
    └── [MODIFY] discovery-session.service.ts  # Override findById nạp dataProvider relation

only-one-fe/
├── src/libs/
│   └── [MODIFY] layout-helper.ts             # Chuẩn hóa UUID segment thành 'Chi tiết'
└── src/app/(root)/scraping/discovery/[id]/components/
    └── [MODIFY] SessionOverviewCard.tsx       # Hiển thị dataProvider name/baseUrl thay vì raw UUID
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/services/discovery-session.service.ts` | `DiscoverySessionService.findById` | `None` | `npx tsc --project tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `only-one-fe/src/libs/layout-helper.ts` | `getSectionBreadcrumbs` | `None` | `npx tsc --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/scraping/discovery/[id]/components/SessionOverviewCard.tsx` | `SessionOverviewCard` | `None` | `npx tsc --noEmit` |

## Section 4. Code Changes (Unified Diff)
### 1. `[MODIFY]` `only-one-be/src/modules/data-provider/services/discovery-session.service.ts`
```diff
@@ -6,6 +6,7 @@
 
 import { BaseService } from '../../../common/base.service';
 import { PayloadDto } from '../../../common/dto/payload.dto';
+import { IFindOptions } from '../../../common/interfaces/base-service.interface';
 import { AppException } from '../../../exceptions/app.exception';
 import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
@@ -53,6 +54,13 @@
         super(discoverySessionRepository, mapper, DiscoverySessionDto, DiscoverySessionService.name);
     }
 
+    override async findById(id: string, options?: IFindOptions<DiscoverySessionEntity>): Promise<DiscoverySessionDto> {
+        return super.findById(id, {
+            ...options,
+            relations: options?.relations ?? { dataProvider: true },
+        });
+    }
+
     async create(request: CreateDiscoverySessionRequestDto, user?: PayloadDto): Promise<DiscoverySessionDto> {
```

### 2. `[MODIFY]` `only-one-fe/src/libs/layout-helper.ts`
```diff
@@ -62,9 +62,13 @@
                 .filter(Boolean);
 
             subSegments.forEach((segment, idx) => {
+                const decoded = decodeURIComponent(segment);
+                const isUuid =
+                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded);
+
                 breadcrumbs.push({
                     key: `sub-${idx}-${segment}`,
-                    label: decodeURIComponent(segment),
+                    label: isUuid ? 'Chi tiết' : decoded,
                 });
             });
         }
```

### 3. `[MODIFY]` `only-one-fe/src/app/(root)/scraping/discovery/[id]/components/SessionOverviewCard.tsx`
```diff
@@ -139,10 +139,13 @@
                                     strong
                                     className="text-sm text-hub-title truncate"
                                 >
-                                    {session?.dataProvider?.name || '—'}
+                                    {session?.dataProvider?.name || session?.dataProvider?.identifier || '—'}
                                 </CustomTypography.Text>
-                                <CustomTypography.Text className="font-mono text-xs text-hub-subtitle">
-                                    ID: {session?.dataProviderId || '—'}
+                                <CustomTypography.Text className="text-xs text-hub-subtitle truncate">
+                                    {session?.dataProvider?.baseUrl ||
+                                        (session?.dataProvider?.identifier
+                                            ? `@${session.dataProvider.identifier}`
+                                            : 'Nhà cung cấp')}
                                 </CustomTypography.Text>
                             </CustomFlex>
                         </SessionMetricCard>
```

## Section 5. Verification & Regression Guard
- **Automated Type Checks**:
  - Frontend (`npx tsc --noEmit`): `PASS (Green, 0 errors)`
  - Backend (`npx tsc --project tsconfig.build.json --noEmit`): `PASS (Green, 0 errors)`
