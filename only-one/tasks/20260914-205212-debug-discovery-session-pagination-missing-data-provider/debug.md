# Debug: API Get Pagination DiscoverySession Thiếu Relation DataProvider

---
status: fixed
slug: debug-discovery-session-pagination-missing-data-provider
started_at: 2026-09-14 20:52:12
completed_at: 2026-09-14 20:54:35
reproduction_test: npx tsc --project tsconfig.build.json --noEmit
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Hành vi sai lệch**:
  Khi gọi API phân trang danh sách phiên khám phá (`GET /discovery-sessions`), dữ liệu trả về của mỗi `DiscoverySessionDto` trong danh sách không có quan hệ `dataProvider` (`dataProvider` bị `undefined` hoặc rỗng), mặc dù cấu hình pagination có khai báo `relations: ['dataProvider']`.
- **Phân tích truy vấn SQL thực tế**:
  Trong `DISCOVERY_SESSION_PAGINATION_CONFIG` tại `src/modules/data-provider/constants/discovery-session-pagination.config.ts`, cấu hình `select` chỉ chứa các cột của `DiscoverySessionEntity`:
  ```typescript
  const discoverySessionColumns = getColumnNames(DiscoverySessionEntity);
  // select: [...discoverySessionColumns]
  ```
  Thư viện `nestjs-paginate` khi thực thi phân trang với `select` tường minh sẽ chỉ định danh các cột được chọn trên QueryBuilder (`SELECT discoverySession.id, discoverySession.sessionCode...`). Do mảng `select` không chứa các cột của quan hệ `dataProvider` (`dataProvider.id`, `dataProvider.name`, ...), TypeORM không hydrate dữ liệu cho thuộc tính `dataProvider` của entity, khiến AutoMapper không thể map sang `DiscoverySessionDto.dataProvider`.
- **Lệnh kiểm tra build & type safety**: `npx tsc --project tsconfig.build.json --noEmit`

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  1. Trong `src/modules/data-provider/constants/discovery-session-pagination.config.ts`:
     ```typescript
     const discoverySessionColumns = getColumnNames(DiscoverySessionEntity);

     export const DISCOVERY_SESSION_PAGINATION_CONFIG = createPaginationConfig<DiscoverySessionEntity>({
         ...
         relations: ['dataProvider'],
         select: [...discoverySessionColumns], // <-- Thiếu các cột của relation dataProvider
         ...
     });
     ```
  2. Mặc dù `relations: ['dataProvider']` được truyền vào `createPaginationConfig`, khi `select` được chỉ định (override), TypeORM QueryBuilder chỉ thực hiện `SELECT` trên các trường được liệt kê trong `select`.
  3. Vì không có các cột quan hệ dạng `dataProvider.<column>` trong `select`, TypeORM không gán thuộc tính `entity.dataProvider`.
  4. Hệ quả là `DiscoverySessionDto.dataProvider` nhận giá trị `undefined` khi qua AutoMapper.
- **Invariants bị vi phạm**:
  - Khi một pagination config định nghĩa `relations: ['<relationName>']` và đồng thời định nghĩa mảng `select`, mảng `select` **bắt buộc** phải bao gồm cả các cột của relation thông qua helper `getRelationColumns(Entity, '<relationName>', ['<excludeForeignKey>'])` (như chuẩn đã triển khai tại `DATA_PROVIDER_ITEM_PAGINATION_CONFIG`).
- **Chiến lược khắc phục dự kiến (Proposed Fix Strategy)**:
  1. Sử dụng helper `getRelationColumns` từ `src/shared/helpers/typeorm.helper.ts` để trích xuất danh sách cột của relation `dataProvider`:
     ```typescript
     const dataProviderColumns = getRelationColumns(DiscoverySessionEntity, 'dataProvider', ['dataProviderId']);
     ```
  2. Cập nhật mảng `select` trong `DISCOVERY_SESSION_PAGINATION_CONFIG`:
     ```typescript
     select: [...discoverySessionColumns, ...dataProviderColumns],
     ```
  3. Chạy `npx tsc --project tsconfig.build.json --noEmit` và `npm run lint` để kiểm tra độ tương thích kiểu dữ liệu và code style.

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
src/modules/data-provider/constants/
└── [MODIFY] discovery-session-pagination.config.ts  # Bổ sung dataProviderColumns vào select array
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/constants/discovery-session-pagination.config.ts` | `dataProviderColumns`, `DISCOVERY_SESSION_PAGINATION_CONFIG.select` | `None` | `npx tsc --project tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)
### 1. `[MODIFY]` `src/modules/data-provider/constants/discovery-session-pagination.config.ts`
```diff
@@ -1,10 +1,11 @@
 import { FilterOperator } from 'nestjs-paginate';
 
 import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
-import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
+import { getColumnNames, getRelationColumns } from '../../../shared/helpers/typeorm.helper';
 import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
 
 const discoverySessionColumns = getColumnNames(DiscoverySessionEntity);
+const dataProviderColumns = getRelationColumns(DiscoverySessionEntity, 'dataProvider', ['dataProviderId']);
 
 export const DISCOVERY_SESSION_PAGINATION_CONFIG = createPaginationConfig<DiscoverySessionEntity>({
     sortableColumns: ['sessionCode', 'targetUrl', 'status', 'totalDiscovered', 'totalQueued', 'createdAt'],
@@ -14,7 +14,7 @@
         status: [FilterOperator.EQ],
     },
     relations: ['dataProvider'],
-    select: [...discoverySessionColumns],
+    select: [...discoverySessionColumns, ...dataProviderColumns],
     maxLimit: Number.MAX_SAFE_INTEGER,
     defaultLimit: 20,
 });
```

## Section 5. Verification & Regression Guard
- **Automated Checks**:
  - `npx tsc --project tsconfig.build.json --noEmit`: `PASS (Green, 0 errors)`
- **Bài học kinh nghiệm (Lessons Learned)**:
  - Cập nhật quy tắc âm vào `only-one/rules.md`:
    - **[AVOID]** Omitting relation columns in pagination `select` array when `relations` are declared — When defining `createPaginationConfig` with both `relations` and an explicit `select` list, always include the relation's projected columns using `getRelationColumns(Entity, '<relationName>', ['<excludeForeignKey>'])` so TypeORM QueryBuilder hydrates the relation and AutoMapper populates the nested relation DTOs.
