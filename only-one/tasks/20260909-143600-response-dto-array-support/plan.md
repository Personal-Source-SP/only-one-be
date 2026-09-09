---
status: done
slug: response-dto-array-support
started_at: 2026-09-09
completed_at: 2026-09-09
pr_url: ~
branch: ~
---

# Plan: Chuẩn hóa Bộ Decorator REST API (@Get, @Post, @Put, @Delete, @Patch) & Hỗ trợ responseDto: [Dto]

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- **Cơ chế & Điểm nghẽn hiện tại**: Hệ thống đang sử dụng các decorator dài dòng (`@GetRestApi`, `@PostRestApi`, `@PutRestApi`, `@DeleteRestApi`, `@PatchRestApi`). Khi một endpoint trả về danh sách, developer phải khai báo thủ công cả 2 thuộc tính `responseDto: FooDto` và `isArray: true`, dễ dẫn đến quên cờ `isArray` làm sai lệch schema Swagger/OpenAPI.
- **Xung đột Import & Nhầm lẫn**: Developer thường xuyên phải import các decorator route từ `@nestjs/common` và `src/decorators`, gây phân tán và thiếu đồng nhất.
- **Invariants bắt buộc bảo toàn**:
  - `BaseApiOkResponse` tiếp tục sinh schema bọc trong `ResponseDto<T>` (`{ data, isSuccess, errors }`) chuẩn của dự án.
  - Mã HTTP status mặc định (`HttpStatus.OK`) và Version mặc định (`'1'`) không bị thay đổi.
  - Tất cả route path và Swagger ApiOperation metadata hiện có phải giữ nguyên 100%.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

- **Type Signatures & Code Contracts**:
  ```typescript
  // src/decorators/base-response.decorator.ts & src/decorators/rest-api.decorator.ts
  export type ResponseDtoType = Type<unknown> | [Type<unknown>];

  export interface IRestApiOptions {
      path?: string | string[];
      summary?: string;
      description?: string;
      responseDto?: ResponseDtoType;
      version?: string | string[];
      httpCode?: HttpStatus;
      deprecated?: boolean;
  }

  export type RestApiInput = string | string[] | IRestApiOptions;
  ```

- **AST Seams & Callers**:
  - `src/decorators/base-response.decorator.ts`: Hàm `BaseApiOkResponse(dataDto: ResponseDtoType)`.
  - `src/decorators/rest-api.decorator.ts`: Export các hàm `Get`, `Post`, `Put`, `Delete`, `Patch`.
  - 27 controllers trong `src/modules/**`, `src/app.controller.ts`, và `src/common/base.controller.ts`: Thay thế import và decorator usages.
  - `only-one/rules.md`: Cập nhật convention rule.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
only-one/
└── [MODIFY] rules.md
src/
├── [MODIFY] app.controller.ts
├── common/
│   └── [MODIFY] base.controller.ts
├── decorators/
│   ├── [MODIFY] base-response.decorator.ts
│   └── [MODIFY] rest-api.decorator.ts
└── modules/
    ├── auth/controllers/
    │   └── [MODIFY] auth.controller.ts
    ├── cloud-data/controllers/
    │   ├── [MODIFY] cloud-data-item.controller.ts
    │   └── [MODIFY] cloud-data-provider.controller.ts
    ├── data-provider/controllers/
    │   ├── [MODIFY] config-version.controller.ts
    │   ├── [MODIFY] data-provider-feature.controller.ts
    │   ├── [MODIFY] data-provider-item.controller.ts
    │   ├── [MODIFY] data-provider.controller.ts
    │   ├── [MODIFY] discovery-session.controller.ts
    │   ├── [MODIFY] discovery-url.controller.ts
    │   ├── [MODIFY] discovery-validation.controller.ts
    │   ├── [MODIFY] item.controller.ts
    │   └── [MODIFY] scraping-data.controller.ts
    ├── google/controllers/
    │   ├── [MODIFY] file-tag.controller.ts
    │   ├── [MODIFY] google-auth.controller.ts
    │   ├── [MODIFY] google-drive.controller.ts
    │   └── [MODIFY] google-folder.controller.ts
    ├── import-data/controllers/
    │   └── [MODIFY] import-data.controller.ts
    ├── queue/controllers/
    │   └── [MODIFY] queue.controller.ts
    ├── schedule/controllers/
    │   ├── [MODIFY] schedule-job.controller.ts
    │   └── [MODIFY] schedule.controller.ts
    ├── setting/controllers/
    │   └── [MODIFY] setting.controller.ts
    ├── simulation/controllers/
    │   ├── [MODIFY] simulation-context.controller.ts
    │   ├── [MODIFY] simulation-item.controller.ts
    │   └── [MODIFY] simulation.controller.ts
    └── user/controllers/
        └── [MODIFY] user.controller.ts
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/decorators/base-response.decorator.ts` | `BaseApiOkResponse`, `ResponseDtoType`, `getSchemaProperty` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/decorators/rest-api.decorator.ts` | `Get`, `Post`, `Put`, `Delete`, `Patch`, `IRestApiOptions` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/app.controller.ts` | `AppController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/common/base.controller.ts` | `BaseController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/auth/controllers/auth.controller.ts` | `AuthController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/cloud-data/controllers/cloud-data-item.controller.ts` | `CloudDataItemController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/cloud-data/controllers/cloud-data-provider.controller.ts` | `CloudDataProviderController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **8** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/config-version.controller.ts` | `ConfigVersionController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **9** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider-feature.controller.ts` | `DataProviderFeatureController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **10** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider-item.controller.ts` | `DataProviderItemController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **11** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider.controller.ts` | `DataProviderController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **12** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-session.controller.ts` | `DiscoverySessionController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **13** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-url.controller.ts` | `DiscoveryUrlController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **14** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-validation.controller.ts` | `DiscoveryValidationController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **15** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/item.controller.ts` | `ItemController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **16** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/scraping-data.controller.ts` | `ScrapingDataController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **17** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/file-tag.controller.ts` | `FileTagController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **18** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/google-auth.controller.ts` | `GoogleAuthController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **19** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/google-drive.controller.ts` | `GoogleDriveController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **20** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/google-folder.controller.ts` | `GoogleFolderController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **21** | `[x]` | `[MODIFY]` | `src/modules/import-data/controllers/import-data.controller.ts` | `ImportDataController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **22** | `[x]` | `[MODIFY]` | `src/modules/queue/controllers/queue.controller.ts` | `QueueController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **23** | `[x]` | `[MODIFY]` | `src/modules/schedule/controllers/schedule-job.controller.ts` | `ScheduleJobController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **24** | `[x]` | `[MODIFY]` | `src/modules/schedule/controllers/schedule.controller.ts` | `ScheduleController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **25** | `[x]` | `[MODIFY]` | `src/modules/setting/controllers/setting.controller.ts` | `SettingController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **26** | `[x]` | `[MODIFY]` | `src/modules/simulation/controllers/simulation-context.controller.ts` | `SimulationContextController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **27** | `[x]` | `[MODIFY]` | `src/modules/simulation/controllers/simulation-item.controller.ts` | `SimulationItemController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **28** | `[x]` | `[MODIFY]` | `src/modules/simulation/controllers/simulation.controller.ts` | `SimulationController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **29** | `[x]` | `[MODIFY]` | `src/modules/user/controllers/user.controller.ts` | `UserController` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **30** | `[x]` | `[MODIFY]` | `only-one/rules.md` | `Rule 14` | `None` | `git status` |


## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/decorators/base-response.decorator.ts`
> **Action**: Loại bỏ cờ `isArray`, hỗ trợ `ResponseDtoType = Type<unknown> | [Type<unknown>]` và tự động unwrapping model DTO.

```diff
@@ -6,9 +6,8 @@
-type DataDto = Type<unknown>;
-type BaseApiOkResponseOptions = {
-    isArray: boolean;
-};
+export type ResponseDtoType = Type<unknown> | [Type<unknown>];

-const getSchemaProperty = (dataDto: DataDto, options?: BaseApiOkResponseOptions) => {
-    if (options?.isArray) {
+const getSchemaProperty = (dataDto: Type<unknown>, isArray: boolean) => {
+    if (isArray) {
         return {
             type: 'array',
             items: {
@@ -33,4 +32,8 @@
-export const BaseApiOkResponse = <DataDto extends Type<unknown>>(dataDto: DataDto, options?: BaseApiOkResponseOptions) =>
+export const BaseApiOkResponse = (dataDto: ResponseDtoType) => {
+    const isArray = Array.isArray(dataDto);
+    const targetDto = isArray ? dataDto[0] : dataDto;
+
+    return applyDecorators(
-        ApiExtraModels(ResponseDto, dataDto),
+        ApiExtraModels(ResponseDto, targetDto),
         ApiOkResponse({
             schema: {
                 allOf: [
@@ -42,3 +45,4 @@
-                            data: getSchemaProperty(dataDto, options),
+                            data: getSchemaProperty(targetDto, isArray),
                         },
                     },
                 ],
             },
         }),
     );
+};
```

### 2. `[MODIFY]` `src/decorators/rest-api.decorator.ts`
> **Action**: Đổi tên các hàm thành `Get, Post, Put, Delete, Patch`, hỗ trợ cả String path lẫn Options object, loại bỏ `isArray`.

```diff
@@ -1,6 +1,18 @@
 import type { Type } from '@nestjs/common';
 import {
     applyDecorators,
-    Delete,
-    Get,
+    Delete as NestDelete,
+    Get as NestGet,
     HttpCode,
     HttpStatus,
-    Patch,
-    Post,
-    Put,
+    Patch as NestPatch,
+    Post as NestPost,
+    Put as NestPut,
     RequestMethod,
     Version,
 } from '@nestjs/common';
 import { ApiOperation } from '@nestjs/swagger';

-import { BaseApiOkResponse } from './base-response.decorator';
+import { BaseApiOkResponse, ResponseDtoType } from './base-response.decorator';

 export interface IRestApiOptions {
     path?: string | string[];
     summary?: string;
     description?: string;
-    responseDto?: Type<unknown>;
-    isArray?: boolean;
+    responseDto?: ResponseDtoType;
     version?: string | string[];
     httpCode?: HttpStatus;
     deprecated?: boolean;
 }

+export type RestApiInput = string | string[] | IRestApiOptions;
+
+const normalizeOptions = (input?: RestApiInput): IRestApiOptions => {
+    if (!input) return {};
+    if (typeof input === 'string' || Array.isArray(input)) {
+        return { path: input };
+    }
+    return input;
+};

 const createRestApiDecorator = (
     method: RequestMethod,
     defaultStatus: HttpStatus = HttpStatus.OK,
-    options: IRestApiOptions = {},
+    input?: RestApiInput,
 ): MethodDecorator => {
+    const options = normalizeOptions(input);
     const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [];

     // 1. API Versioning (default '1')
@@ -31,17 +43,17 @@
     switch (method) {
         case RequestMethod.GET:
-            decorators.push(Get(path));
+            decorators.push(NestGet(path));
             break;
         case RequestMethod.POST:
-            decorators.push(Post(path));
+            decorators.push(NestPost(path));
             break;
         case RequestMethod.PUT:
-            decorators.push(Put(path));
+            decorators.push(NestPut(path));
             break;
         case RequestMethod.DELETE:
-            decorators.push(Delete(path));
+            decorators.push(NestDelete(path));
             break;
         case RequestMethod.PATCH:
-            decorators.push(Patch(path));
+            decorators.push(NestPatch(path));
             break;
         default:
-            decorators.push(Get(path));
+            decorators.push(NestGet(path));
             break;
     }

@@ -66,7 +78,7 @@
     // 5. Response Schema via BaseApiOkResponse
     if (options.responseDto) {
-        decorators.push(BaseApiOkResponse(options.responseDto, { isArray: options.isArray ?? false }));
+        decorators.push(BaseApiOkResponse(options.responseDto));
     }

     return applyDecorators(...decorators);
 };

-export function GetRestApi(options?: IRestApiOptions): MethodDecorator {
+export function Get(options?: RestApiInput): MethodDecorator {
     return createRestApiDecorator(RequestMethod.GET, HttpStatus.OK, options);
 }

-export function PostRestApi(options?: IRestApiOptions): MethodDecorator {
+export function Post(options?: RestApiInput): MethodDecorator {
     return createRestApiDecorator(RequestMethod.POST, HttpStatus.OK, options);
 }

-export function PutRestApi(options?: IRestApiOptions): MethodDecorator {
+export function Put(options?: RestApiInput): MethodDecorator {
     return createRestApiDecorator(RequestMethod.PUT, HttpStatus.OK, options);
 }

-export function DeleteRestApi(options?: IRestApiOptions): MethodDecorator {
+export function Delete(options?: RestApiInput): MethodDecorator {
     return createRestApiDecorator(RequestMethod.DELETE, HttpStatus.OK, options);
 }

-export function PatchRestApi(options?: IRestApiOptions): MethodDecorator {
+export function Patch(options?: RestApiInput): MethodDecorator {
     return createRestApiDecorator(RequestMethod.PATCH, HttpStatus.OK, options);
 }
```

### 3. `[MODIFY]` `src/modules/data-provider/controllers/data-provider-feature.controller.ts`
> **Action**: Cập nhật sang decorator `@Get`, `@Post`, `@Put` và `responseDto: [DataProviderFeatureDto]`.

```diff
@@ -5,7 +5,7 @@
 import { PayloadDto } from '../../../common/dto/payload.dto';
-import { Auth, GetRestApi, PostRestApi, PutRestApi, User, UUIDParam } from '../../../decorators';
+import { Auth, Get, Post, Put, User, UUIDParam } from '../../../decorators';
 import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
@@ -25,6 +25,5 @@
-    @GetRestApi({
+    @Get({
         path: 'data-providers/:dataProviderId',
         summary: 'Get all features by provider ID',
-        responseDto: DataProviderFeatureDto,
-        isArray: true,
+        responseDto: [DataProviderFeatureDto],
     })
@@ -35,3 +34,3 @@
-    @GetRestApi({
+    @Get({
         path: 'data-providers/:dataProviderId/:type',
         summary: 'Get feature by provider ID and type',
@@ -47,3 +46,3 @@
-    @GetRestApi({
+    @Get({
         path: ':id',
         summary: 'Get feature by ID',
@@ -56,3 +55,3 @@
-    @PostRestApi({
+    @Post({
         path: 'test',
         summary: 'Test feature stateless (sandbox)',
@@ -65,3 +64,3 @@
-    @PostRestApi({
+    @Post({
         path: 'data-providers/:dataProviderId',
         summary: 'Create feature for a data provider',
@@ -79,3 +78,3 @@
-    @PutRestApi({
+    @Put({
         path: ':id/config',
         summary: 'Update feature config',
```

### 4. `[MODIFY]` `src/modules/data-provider/controllers/discovery-url.controller.ts`
> **Action**: Thay thế `GetRestApi`, `PostRestApi`, `PutRestApi`, `DeleteRestApi` $\rightarrow$ `Get, Post, Put, Delete` và chuyển `isArray: true` $\rightarrow$ `[DiscoveryUrlDto]`.

```diff
@@ -6,3 +6,3 @@
 import { PaginationRequestDto } from '../../../common/dto/pagination-request.dto';
-import { Auth, DeleteRestApi, GetRestApi, PostRestApi, PutRestApi, UUIDParam } from '../../../decorators';
+import { Auth, Delete, Get, Post, Put, UUIDParam } from '../../../decorators';
 import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
@@ -27,4 +27,3 @@
-    @GetRestApi({
+    @Get({
         summary: 'Get all discovery URLs',
-        responseDto: DiscoveryUrlDto,
-        isArray: true,
+        responseDto: [DiscoveryUrlDto],
     })
@@ -34,3 +33,3 @@
-    @GetRestApi({
+    @Get({
         path: 'search',
         summary: 'Search discovery URLs',
@@ -48,3 +47,3 @@
-    @GetRestApi({
+    @Get({
         path: ':id',
         summary: 'Get discovery URL by ID',
@@ -56,3 +55,3 @@
-    @PostRestApi({
+    @Post({
         summary: 'Create a new discovery URL',
@@ -65,3 +64,3 @@
-    @PutRestApi({
+    @Put({
         path: ':id',
         summary: 'Update a discovery URL',
@@ -77,3 +76,3 @@
-    @DeleteRestApi({
+    @Delete({
         path: ':id',
         summary: 'Delete a discovery URL',
```

### 5. `[MODIFY]` `src/modules/data-provider/controllers/config-version.controller.ts`
> **Action**: Thay thế `GetRestApi`, `PostRestApi` $\rightarrow$ `Get, Post` và `[ConfigVersionDto]`.

```diff
@@ -4,3 +4,3 @@
 import { PayloadDto } from '../../../common/dto/payload.dto';
-import { Auth, GetRestApi, PostRestApi, User, UUIDParam } from '../../../decorators';
+import { Auth, Get, Post, User, UUIDParam } from '../../../decorators';
 import { ConfigVersionDto } from '../dtos/config-version.dto';
@@ -23,4 +23,3 @@
-    @GetRestApi({
+    @Get({
         summary: 'Get configuration version history for a feature',
-        responseDto: ConfigVersionDto,
-        isArray: true,
+        responseDto: [ConfigVersionDto],
     })
@@ -32,3 +31,3 @@
-    @GetRestApi({
+    @Get({
         path: ':id',
         summary: 'Get configuration version details by ID',
@@ -40,3 +39,3 @@
-    @PostRestApi({
+    @Post({
         path: ':version/rollback',
         summary: 'Rollback feature configuration to a specific version',
```

### 6. `[MODIFY]` `src/modules/data-provider/controllers/data-provider-item.controller.ts`
> **Action**: Thay thế `GetRestApi`, `PostRestApi`, `PutRestApi`, `DeleteRestApi` $\rightarrow$ `Get, Post, Put, Delete` và `[DataProviderItemDto]`.

```diff
@@ -6,3 +6,3 @@
 import { PaginationRequestDto } from '../../../common/dto/pagination-request.dto';
-import { Auth, DeleteRestApi, GetRestApi, PostRestApi, PutRestApi, UUIDParam } from '../../../decorators';
+import { Auth, Delete, Get, Post, Put, UUIDParam } from '../../../decorators';
 import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
@@ -26,4 +26,3 @@
-    @GetRestApi({
+    @Get({
         summary: 'Get all data provider items',
-        responseDto: DataProviderItemDto,
-        isArray: true,
+        responseDto: [DataProviderItemDto],
     })
@@ -34,3 +33,3 @@
-    @GetRestApi({
+    @Get({
         path: 'search',
         summary: 'Search data provider items',
@@ -48,3 +47,3 @@
-    @GetRestApi({
+    @Get({
         path: ':id',
         summary: 'Get data provider item by ID',
@@ -56,3 +55,3 @@
-    @PostRestApi({
+    @Post({
         summary: 'Create a new data provider item',
@@ -65,3 +64,3 @@
-    @PutRestApi({
+    @Put({
         path: ':id',
         summary: 'Update a data provider item',
@@ -77,3 +76,3 @@
-    @DeleteRestApi({
+    @Delete({
         path: ':id',
         summary: 'Delete a data provider item',
```

### 7. `[MODIFY]` `src/modules/schedule/controllers/schedule-job.controller.ts`
> **Action**: Thay thế `GetRestApi`, `PostRestApi`, `PutRestApi`, `DeleteRestApi` $\rightarrow$ `Get, Post, Put, Delete` và `[ScheduleJobDto]`.

```diff
@@ -5,3 +5,3 @@
 import { PayloadDto } from '../../../common/dto/payload.dto';
-import { Auth, DeleteRestApi, GetRestApi, PostRestApi, PutRestApi, User, UUIDParam } from '../../../decorators';
+import { Auth, Delete, Get, Post, Put, User, UUIDParam } from '../../../decorators';
 import { ScheduleJobDto } from '../dtos/schedule-job.dto';
@@ -27,4 +27,3 @@
-    @GetRestApi({
+    @Get({
         summary: 'Get all schedule jobs',
-        responseDto: ScheduleJobDto,
-        isArray: true,
+        responseDto: [ScheduleJobDto],
     })
@@ -34,3 +33,3 @@
-    @GetRestApi({
+    @Get({
         path: ':id',
         summary: 'Get schedule job by ID',
@@ -42,3 +41,3 @@
-    @PostRestApi({
+    @Post({
         summary: 'Create a new schedule job',
@@ -54,3 +53,3 @@
-    @PutRestApi({
+    @Put({
         path: ':id',
         summary: 'Update a schedule job',
@@ -66,3 +65,3 @@
-    @DeleteRestApi({
+    @Delete({
         path: ':id',
         summary: 'Delete a schedule job',
```

### 8. `[MODIFY]` `src/common/base.controller.ts`
> **Action**: Cập nhật BaseController sang `@Get, @Post, @Put, @Delete, @Patch`.

```diff
@@ -10,6 +10,6 @@
 import { PaginationRequestDto } from './dto/pagination-request.dto';
 import { ResponseDto } from './dto/response.dto';
-import { DeleteRestApi, GetRestApi, PatchRestApi, PostRestApi, PutRestApi, UUIDParam } from '../decorators';
+import { Delete, Get, Patch, Post, Put, UUIDParam } from '../decorators';

@@ -29,4 +29,3 @@
-        @GetRestApi({
+        @Get({
             summary: `Get all ${resourceName}`,
-            responseDto: options.dto,
-            isArray: true,
+            responseDto: [options.dto],
         })
@@ -36,3 +35,3 @@
-        @GetRestApi({
+        @Get({
             path: ':id',
             summary: `Get ${resourceName} by ID`,
@@ -44,3 +43,3 @@
-        @PostRestApi({
+        @Post({
             summary: `Create ${resourceName}`,
@@ -52,3 +51,3 @@
-        @PutRestApi({
+        @Put({
             path: ':id',
             summary: `Update ${resourceName}`,
@@ -60,3 +59,3 @@
-        @DeleteRestApi({
+        @Delete({
             path: ':id',
             summary: `Delete ${resourceName}`,
```

### 9. `[MODIFY]` Toàn bộ các controller còn lại
> **Action**: Thay thế `*RestApi` $\rightarrow$ `Get, Post, Put, Delete, Patch` từ `src/decorators` (hoặc relative path) và xóa import tương ứng từ `@nestjs/common`.

Các files:
- `src/app.controller.ts`
- `src/modules/auth/controllers/auth.controller.ts`
- `src/modules/cloud-data/controllers/cloud-data-item.controller.ts`
- `src/modules/cloud-data/controllers/cloud-data-provider.controller.ts`
- `src/modules/data-provider/controllers/data-provider.controller.ts`
- `src/modules/data-provider/controllers/discovery-session.controller.ts`
- `src/modules/data-provider/controllers/discovery-validation.controller.ts`
- `src/modules/data-provider/controllers/item.controller.ts`
- `src/modules/data-provider/controllers/scraping-data.controller.ts`
- `src/modules/google/controllers/file-tag.controller.ts`
- `src/modules/google/controllers/google-auth.controller.ts`
- `src/modules/google/controllers/google-drive.controller.ts`
- `src/modules/google/controllers/google-folder.controller.ts`
- `src/modules/import-data/controllers/import-data.controller.ts`
- `src/modules/queue/controllers/queue.controller.ts`
- `src/modules/schedule/controllers/schedule.controller.ts`
- `src/modules/setting/controllers/setting.controller.ts`
- `src/modules/simulation/controllers/simulation-context.controller.ts`
- `src/modules/simulation/controllers/simulation-item.controller.ts`
- `src/modules/simulation/controllers/simulation.controller.ts`
- `src/modules/user/controllers/user.controller.ts`

### 10. `[MODIFY]` `only-one/rules.md`
> **Action**: Cập nhật rule 14 cho decorators mới.

```diff
@@ -14,2 +14,2 @@
-- **[AVOID]** Declaring redundant boilerplate Swagger and HTTP method decorators separately across controllers — Standardize on composite REST API decorators (`@GetRestApi`, `@PostRestApi`, `@PutRestApi`, `@DeleteRestApi`, `@PatchRestApi`) for cohesive OpenAPI documentation and route declaration.
+- **[AVOID]** Declaring redundant boilerplate Swagger and HTTP method decorators separately across controllers — Standardize on composite REST API decorators (`@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` from `src/decorators`) supporting `responseDto: [Dto]` for cohesive OpenAPI documentation and route declaration.
```

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` (PASS - Exit code 0, 0 TypeScript errors).
  - `[x]` `ESLINT_USE_FLAT_CONFIG=false npx eslint "src/**/*.ts"` (PASS - Exit code 0, 0 errors, 0 warnings).
  - `[x]` `npm run build` (PASS - Build dist bundle compiled successfully).
- **Manual Checks**:
  - `[x]` Swagger / OpenAPI route decorators và schema definitions hoạt động đồng bộ qua `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`.
