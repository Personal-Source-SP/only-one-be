# Concept: Chuẩn hóa Bộ Decorator REST API (@Get, @Post, @Put, @Delete, @Patch) & Hỗ trợ responseDto: [Dto]

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Tên Decorator dài dòng & Không đồng nhất**: Hiện tại hệ thống dùng các tên riêng biệt như `@GetRestApi()`, `@PostRestApi()`, `@PutRestApi()`, `@DeleteRestApi()`, `@PatchRestApi()`. Điều này khiến code controller dài dòng và khác biệt so với chuẩn quen thuộc `@Get()`, `@Post()` của NestJS.
- **Dư thừa thuộc tính `isArray`**: Khi endpoint trả về danh sách, developer phải khai báo cả `responseDto: FooDto` và `isArray: true`, dễ quên cờ `isArray` dẫn đến sai lệch tài liệu Swagger.
- **Xung đột / Phân tán Decorator**: Hiện tại trong controller vừa import `@nestjs/common` vừa import `src/decorators`, dễ gây nhầm lẫn giữa `@Get` thuần của Nest (thiếu swagger, version, response envelope) và `@GetRestApi`.

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Đổi tên chuẩn hóa**:
  - `@GetRestApi()` $\rightarrow$ `@Get()`
  - `@PostRestApi()` $\rightarrow$ `@Post()`
  - `@PutRestApi()` $\rightarrow$ `@Put()`
  - `@DeleteRestApi()` $\rightarrow$ `@Delete()`
  - `@PatchRestApi()` $\rightarrow$ `@Patch()`
- **Đa năng hóa tham số đầu vào**: Cho phép truyền cả dạng String path hoặc Options object:
  - `@Get('users')` hoặc `@Get(['users', 'v2/users'])`
  - `@Get({ path: 'users', summary: '...', responseDto: [UserDto] })`
- **Loại bỏ hoàn toàn `isArray`**:
  - Hỗ trợ `responseDto: UserDto` (Object đơn) và `responseDto: [UserDto]` (Array danh sách).
- **Refactor toàn bộ Controller**: Quét và cập nhật toàn bộ controller trong dự án sang bộ decorator mới, loại bỏ `isArray`.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - [rest-api.decorator.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/rest-api.decorator.ts):
    - Đổi tên các hàm export thành `Get`, `Post`, `Put`, `Delete`, `Patch`.
    - Hỗ trợ tham số `options?: string | string[] | IRestApiOptions`.
    - Định nghĩa `ResponseDtoType = Type<unknown> | [Type<unknown>]`.
  - [base-response.decorator.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/base-response.decorator.ts):
    - Bỏ cờ `isArray`, tự động nhận diện `Array.isArray(dataDto)`.
  - [src/decorators/index.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/index.ts): Export các decorator mới.
  - Refactor toàn bộ ~20 files Controller trong `src/modules/**` và `src/app.controller.ts`, `src/common/base.controller.ts`:
    - Thay `*RestApi` $\rightarrow$ `Get, Post, Put, Delete, Patch` từ `src/decorators`.
    - Xóa import `Get, Post, Put, Delete, Patch` từ `@nestjs/common` trong các controller.
    - Chuyển `responseDto: FooDto, isArray: true` $\rightarrow$ `responseDto: [FooDto]`.
- **Explicit Out-of-Scope**:
  - Không thay đổi các decorator route khác (`@Param`, `@Body`, `@Query`, `@Headers` từ `@nestjs/common`).
  - Không thay đổi cấu trúc `ResponseDto<T>` hay runtime interceptors.

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### 3.1. Thiết kế Decorator Chuẩn hóa

#### Tại `src/decorators/rest-api.decorator.ts`:
```typescript
import type { Type } from '@nestjs/common';
import {
    applyDecorators,
    Delete as NestDelete,
    Get as NestGet,
    HttpCode,
    HttpStatus,
    Patch as NestPatch,
    Post as NestPost,
    Put as NestPut,
    RequestMethod,
    Version,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { BaseApiOkResponse, ResponseDtoType } from './base-response.decorator';

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

const normalizeOptions = (input?: RestApiInput): IRestApiOptions => {
    if (!input) return {};
    if (typeof input === 'string' || Array.isArray(input)) {
        return { path: input };
    }
    return input;
};

const createRestApiDecorator = (
    method: RequestMethod,
    defaultStatus: HttpStatus = HttpStatus.OK,
    input?: RestApiInput,
): MethodDecorator => {
    const options = normalizeOptions(input);
    const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [];

    // 1. Versioning
    decorators.push(Version(options.version ?? '1'));

    // 2. HTTP Method Routing
    const path = options.path ?? '';
    switch (method) {
        case RequestMethod.GET:
            decorators.push(NestGet(path));
            break;
        case RequestMethod.POST:
            decorators.push(NestPost(path));
            break;
        case RequestMethod.PUT:
            decorators.push(NestPut(path));
            break;
        case RequestMethod.DELETE:
            decorators.push(NestDelete(path));
            break;
        case RequestMethod.PATCH:
            decorators.push(NestPatch(path));
            break;
    }

    // 3. HTTP Status
    decorators.push(HttpCode(options.httpCode ?? defaultStatus));

    // 4. Swagger ApiOperation
    if (options.summary || options.description || options.deprecated !== undefined) {
        decorators.push(
            ApiOperation({
                summary: options.summary,
                description: options.description,
                deprecated: options.deprecated,
            }),
        );
    }

    // 5. Response Schema
    if (options.responseDto) {
        decorators.push(BaseApiOkResponse(options.responseDto));
    }

    return applyDecorators(...decorators);
};

export function Get(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.GET, HttpStatus.OK, options);
}

export function Post(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.POST, HttpStatus.OK, options);
}

export function Put(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.PUT, HttpStatus.OK, options);
}

export function Delete(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.DELETE, HttpStatus.OK, options);
}

export function Patch(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.PATCH, HttpStatus.OK, options);
}
```

### 3.2. Code Controller Thực tế sau Refactor

```typescript
import { Body, Controller, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth, Get, Post, Put, UUIDParam } from '../../../decorators';
import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';

@Controller('data-provider-features')
@ApiTags('Data Provider Features')
@Auth()
export class DataProviderFeatureController {
    // 1. Endpoint lấy danh sách (Array)
    @Get({
        path: 'data-providers/:dataProviderId',
        summary: 'Get all features by provider ID',
        responseDto: [DataProviderFeatureDto],
    })
    async findByProvider(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.featureService.getFeaturesByProviderId(dataProviderId);
    }

    // 2. Endpoint lấy object đơn
    @Get({
        path: ':id',
        summary: 'Get feature by ID',
        responseDto: DataProviderFeatureDto,
    })
    async findById(@UUIDParam('id') id: string): Promise<DataProviderFeatureDto> {
        return await this.featureService.findById(id);
    }

    // 3. Endpoint ngắn gọn chỉ có path
    @Get('ping')
    ping(): string {
        return 'pong';
    }
}
```

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)
- **Xung đột Import (`@nestjs/common` vs `src/decorators`)**:
  - Nếu trong cùng 1 file vừa import `Get` từ `@nestjs/common` vừa import `Get` từ `decorators`, TypeScript compiler sẽ báo lỗi `Duplicate identifier 'Get'`.
  - **Khắc phục**: Thay thế triệt để, tất cả HTTP routing method decorators trong controller đều import từ `src/decorators` (hoặc alias tương đối), chỉ import `Controller`, `Body`, `Param`, `Query` từ `@nestjs/common`.
- **Default HTTP Status cho POST**:
  - Mặc định NestJS `@Post()` trả về status 201 (CREATED) nếu không có HttpCode, nhưng decorator tùy biến của dự án trước nay set `HttpStatus.OK (200)` làm default. Cần giữ tính nhất quán `HttpStatus.OK` này để không làm thay đổi status code API hiện tại.
