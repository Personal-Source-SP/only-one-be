# Debug: Data Provider Feature Status Validation Error

---
status: fixed
slug: data-provider-feature-status-validation-error
started_at: 2026-09-13 16:15:00
completed_at: 2026-09-13 16:18:00
reproduction_test: node -e "const qs=require('query-string'); const resource='data-providers/all-with-features?featureType=SEARCH&featureStatus=READY'; const url='http://localhost:3000/api/' + resource; const queryPagination={page:1,limit:10}; const queryFilters={}; const fullUrl = \`\${url}?\${qs.stringify(queryPagination)}&\${qs.stringify(queryFilters)}\`; console.log('Generated URL:', fullUrl); const parsed = qs.parseUrl(fullUrl); console.log('Parsed featureStatus query param:', parsed.query.featureStatus);"
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Stack Trace**:
  - Khi frontend gọi hook `useDiscoveryPage` tại [discovery/hooks.ts:L16-L20](file:///d:/Sources/Personal/only-one-fe/src/app/(root)/scraping/discovery/hooks.ts#L16-L20) thông qua `useSelectDataProvider({ featureType: DataProviderFeatureType.SEARCH, featureStatus: DataProviderFeatureStatus.READY })`, Backend API trả về HTTP 422/400 Validation Error:
    ```json
    {
        "errors": [
            {
                "message": "featureStatus must be one of the following values: UNCONFIGURED, TESTING, READY, ERROR, DISABLED",
                "code": "validation_error"
            }
        ]
    }
    ```
- **Red Test Case**:
  - Khi `useSelectDataProvider` dựng `resource` thành `data-providers/all-with-features?featureType=SEARCH&featureStatus=READY`, hàm `RestServer.getList` tại [data-provider.ts:L273-L276](file:///d:/Sources/Personal/only-one-fe/src/providers/data-provider.ts#L273-L276) thực hiện:
    ```typescript
    const url = `${apiUrl}/${resource}`;
    httpClient.get(`${url}?${qs.stringify(queryPagination)}&${qs.stringify(queryFilters)}`);
    ```
  - Chuỗi URL phát sinh bị lỗi dấu chấm hỏi kép (`??`):
    `http://localhost:3000/api/data-providers/all-with-features?featureType=SEARCH&featureStatus=READY?page=1&limit=10&`
  - Backend NestJS `class-validator` phân tích query string và nhận `query.featureStatus` là `"READY?page=1"`. Do giá trị này không nằm trong enum `DataProviderFeatureStatus` (`UNCONFIGURED`, `TESTING`, `READY`, `ERROR`, `DISABLED`), hệ thống kích hoạt Validation Exception.
- **Lệnh chạy tái hiện (Fast Test Loop)**:
  ```bash
  node -e "const qs=require('query-string'); const resource='data-providers/all-with-features?featureType=SEARCH&featureStatus=READY'; const url='http://localhost:3000/api/' + resource; const queryPagination={page:1,limit:10}; const queryFilters={}; const fullUrl = \`\${url}?\${qs.stringify(queryPagination)}&\${qs.stringify(queryFilters)}\`; console.log('Generated URL:', fullUrl); const parsed = qs.parseUrl(fullUrl); console.log('Parsed featureStatus query param:', parsed.query.featureStatus);"
  ```

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  1. **Malformed URL Concatenation trong `RestServer.getList` & `getMany` ([data-provider.ts:L273-L276](file:///d:/Sources/Personal/only-one-fe/src/providers/data-provider.ts#L273-L276))**:
     - `getList` ngầm định `resource` là một URL path đơn thuần (không chứa query params). Khi nối trực tiếp `${url}?${qs.stringify(queryPagination)}&${qs.stringify(queryFilters)}`, nếu `resource` đã chứa sẵn query params (`?featureType=SEARCH&featureStatus=READY`), dấu `?` thứ hai bị chèn vào giữa chuỗi query, biến value của param cuối cùng trước đó thành `READY?page=1`.
     - Đồng thời, `&${qs.stringify(queryFilters)}` tạo ra ký tự `&` thừa ở cuối URL nếu `queryFilters` rỗng.
  2. **Truyền filter qua query string resource trong `useSelectDataProvider` ([useCustomSelect.ts:L93-L102](file:///d:/Sources/Personal/only-one-fe/src/hooks/api/useCustomSelect.ts#L93-L102))**:
     - `useSelectDataProvider` tự serialize query params thành query string và gán vào `resource`. Khi Refine `useSelect` gọi `getList`, `getList` lại tiếp tục nối thêm `queryPagination` và `queryFilters`.
- **Bằng chứng & Dữ liệu thực nghiệm (Evidence)**:
  - Giá trị param `featureStatus` backend nhận được thực tế bị dính `?page=1`, chính xác giải thích vì sao class-validator báo enum validation error dù frontend truyền `DataProviderFeatureStatus.READY`.
- **Invariants bị vi phạm**:
  - Chuỗi URL gửi đi từ `dataProvider` phải luôn chuẩn RFC 3986 (duy nhất 1 ký tự phân tách `?` giữa path và query string).
  - Backend controller query DTO phải nhận được clean enum string không bị lẫn query string fragments.
- **Chiến lược khắc phục dự kiến (Proposed Fix Strategy)**:
  1. **Frontend `RestServer` Fix ([data-provider.ts](file:///d:/Sources/Personal/only-one-fe/src/providers/data-provider.ts))**:
     - Thêm helper `appendQueryParams` để serialize và nối query parameters an toàn bằng `qs.stringify(params, { skipNull: true, skipEmptyString: true })`, xử lý chính xác trường hợp URL đã có query string hay chưa (`url.includes('?') ? '&' : '?'`).
  2. **Backend Unit Tests ([data-provider.service.spec.ts](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/services/_tests/data-provider.service.spec.ts))**:
     - Thêm unit test cho `DataProviderService.findAllWithFeatures` xác thực query filter theo `featureType` và `featureStatus`.

---

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
only-one-fe/
└── src/providers/
    └── [MODIFY] data-provider.ts                                # An toàn hóa việc nối query params trong getList và getMany

only-one-be/
└── src/modules/data-provider/services/_tests/
    └── [NEW]    data-provider.service.spec.ts                   # Unit test cho DataProviderService.findAllWithFeatures
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `only-one-fe/src/providers/data-provider.ts` | `appendQueryParams`, `RestServer.getList`, `RestServer.getMany` | `None` | `node -e "..."` |
| **2** | `[x]` | `[NEW]` | `only-one-be/src/modules/data-provider/services/_tests/data-provider.service.spec.ts` | `describe('DataProviderService')` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)
### 1. `[MODIFY]` `only-one-fe/src/providers/data-provider.ts`
> **Action**: Áp dụng helper `appendQueryParams` và cập nhật `getList`, `getMany`.
```diff
@@ -70,3 +70,9 @@
     return queryFilters;
 };
 
+const appendQueryParams = (baseUrl: string, params: Record<string, any>): string => {
+    const queryString = qs.stringify(params, { skipNull: true, skipEmptyString: true });
+    if (!queryString) return baseUrl;
+    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}`;
+};
+
 export const getSessionToken = (session: Session | null): string | undefined => {
@@ -270,7 +276,7 @@
         const url = `${apiUrl}/${resource}`;
-        const { data: apiResponseData } = await httpClient.get(
-            `${url}?${qs.stringify(queryPagination)}&${qs.stringify(queryFilters)}`,
-        );
+        const requestUrl = appendQueryParams(url, {
+            ...queryPagination,
+            ...queryFilters,
+        });
+        const { data: apiResponseData } = await httpClient.get(requestUrl);
@@ -284,5 +290,3 @@
     getMany: async ({ resource, ids }) => {
-        const { data: apiResponseData } = await httpClient.get(
-            `${apiUrl}/${resource}?${qs.stringify({ id: ids })}`,
-        );
+        const url = `${apiUrl}/${resource}`;
+        const requestUrl = appendQueryParams(url, { id: ids });
+        const { data: apiResponseData } = await httpClient.get(requestUrl);
```

### 2. `[NEW]` `only-one-be/src/modules/data-provider/services/_tests/data-provider.service.spec.ts`
> **Action**: Thêm unit test cho DataProviderService.
```diff
@@ -0,0 +1,78 @@
+import { Mapper } from '@automapper/core';
+import { getMapperToken } from '@automapper/nestjs';
+import { Test, TestingModule } from '@nestjs/testing';
+import { getRepositoryToken } from '@nestjs/typeorm';
+
+import { DataProviderFeatureStatus, DataProviderFeatureType } from '../../enums';
+import { DataProviderEntity } from '../../entities/data-provider.entity';
+import { DataProviderItemService } from '../data-provider-item.service';
+import { DataProviderService } from '../data-provider.service';
+
+describe('DataProviderService', () => {
+    let service: DataProviderService;
+    let mockRepository: any;
+    let mockMapper: any;
+    let mockQueryBuilder: any;
+
+    beforeEach(async () => {
+        mockQueryBuilder = {
+            leftJoinAndSelect: jest.fn().mockReturnThis(),
+            andWhere: jest.fn().mockReturnThis(),
+            orderBy: jest.fn().mockReturnThis(),
+            getMany: jest.fn().mockResolvedValue([]),
+        };
+
+        mockRepository = {
+            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
+            findOne: jest.fn(),
+            find: jest.fn(),
+            create: jest.fn((dto) => dto),
+            save: jest.fn((entity) => Promise.resolve({ id: 'provider-1', ...entity })),
+        };
+
+        mockMapper = {
+            mapArray: jest.fn().mockReturnValue([]),
+            map: jest.fn(),
+        };
+
+        const module: TestingModule = await Test.createTestingModule({
+            providers: [
+                DataProviderService,
+                {
+                    provide: getRepositoryToken(DataProviderEntity),
+                    useValue: mockRepository,
+                },
+                {
+                    provide: getMapperToken(),
+                    useValue: mockMapper,
+                },
+                {
+                    provide: DataProviderItemService,
+                    useValue: {},
+                },
+            ],
+        }).compile();
+
+        service = module.get<DataProviderService>(DataProviderService);
+    });
+
+    it('should query data providers with features filtered by type and status', async () => {
+        const result = await service.findAllWithFeatures({
+            featureType: DataProviderFeatureType.SEARCH,
+            featureStatus: DataProviderFeatureStatus.READY,
+        });
+
+        expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('dataProvider');
+        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('dataProvider.features', 'feature');
+        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('feature.type = :featureType', {
+            featureType: DataProviderFeatureType.SEARCH,
+        });
+        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('feature.status = :featureStatus', {
+            featureStatus: DataProviderFeatureStatus.READY,
+        });
+        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('dataProvider.createdAt', 'DESC');
+        expect(mockQueryBuilder.getMany).toHaveBeenCalled();
+        expect(result).toEqual([]);
+    });
+});
+```

## Section 5. Verification & Regression Guard
- **Automated Tests**:
  - `appendQueryParams` validation: `PASS (Green)` - URL ghép đúng định dạng `http://localhost:3000/api/data-providers/all-with-features?featureType=SEARCH&featureStatus=READY&limit=10&page=1`, parse được clean `featureStatus: "READY"`.
  - Frontend TypeScript Typecheck (`npx tsc --noEmit`): `PASS`
  - Frontend ESLint (`npx eslint src/providers/data-provider.ts`): `PASS`
  - Backend TypeScript Typecheck (`npx tsc -p tsconfig.build.json --noEmit`): `PASS`
- **Bài học kinh nghiệm (Lessons Learned)**:
  - **[NEVER]** Nối chuỗi query string thủ công `${url}?${qs.stringify(...)}` mà không kiểm tra URL đã chứa dấu `?` hay chưa. Luôn sử dụng helper nối query params an toàn (`appendQueryParams`).
