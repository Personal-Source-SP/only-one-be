# Concept: Custom REST API Composite Decorators & Toàn diện Controller Refactoring

## 1. Problem & Goal (Vấn đề & Mục tiêu)
- **Problem**: Mỗi endpoint handler trong NestJS Controller hiện tại phải xếp chồng 4–5 decorators lặp đi lặp lại (`@ApiOperation`, `@Version`, `@Get`/`@Post`/..., `@BaseApiOkResponse`, `@HttpCode`) kèm từ khóa `public` thừa thãi trên các method, gây loãng code (boilerplate), tốn diện tích và dễ dẫn đến sai sót khi quên đính kèm Swagger metadata hoặc API versioning.
- **Goal**:
  1. Xây dựng bộ composite method decorators chuyên dụng theo từng HTTP method (`@GetRestApi`, `@PostRestApi`, `@PutRestApi`, `@DeleteRestApi`, `@PatchRestApi`) giúp tinh gọn khai báo endpoint thành 1 decorator duy nhất nhưng vẫn đầy đủ tính năng Routing, Swagger Doc, API Versioning và Response Schema.
  2. Áp dụng đồng bộ bộ decorator mới cho **toàn bộ 28 Controllers** trong toàn hệ thống và loại bỏ từ khóa `public` ở tất cả các action handler methods.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

### In-Scope:
- **Interfaces & Types**:
  - Định nghĩa interface `IRestApiOptions` chứa các trường:
    - `path?: string | string[]`
    - `summary?: string`
    - `description?: string`
    - `responseDto?: Type<unknown>`
    - `isArray?: boolean`
    - `version?: string | string[]` *(mặc định là `'1'`)*
    - `httpCode?: HttpStatus` *(cho phép override mã HTTP Status Code khi cần)*
    - `deprecated?: boolean`
- **Quy chuẩn Default HTTP Status Code**:
  - `GET`, `PUT`, `PATCH`, `DELETE`: Mặc định là `HttpStatus.OK` (200).
  - `POST`: Mặc định là `HttpStatus.CREATED` (201).
  - Nếu `options.httpCode` được chỉ định (vd: `httpCode: HttpStatus.OK` cho POST action/test/login), decorator sẽ tự động gắn `@HttpCode(options.httpCode)`.
- **Composite Decorator Factory**:
  - Viết helper factory `createRestApiDecorator(method: RequestMethod, defaultStatus: HttpStatus, options?: IRestApiOptions)` sử dụng `applyDecorators`.
  - Tự động tích hợp `Version(options.version ?? '1')`.
  - Tự động đính kèm `ApiOperation({ summary, description, deprecated })` khi có cấu hình.
  - Tự động áp dụng HTTP Method decorator tương ứng (`Get`, `Post`, `Put`, `Delete`, `Patch`).
  - Tự động tích hợp `BaseApiOkResponse(responseDto, { isArray })` khi có `responseDto`.
  - Tự động gắn `@HttpCode(options.httpCode)` nếu có truyền override status code.
- **Exports**:
  - Xuất bản các hàm: `@GetRestApi()`, `@PostRestApi()`, `@PutRestApi()`, `@DeleteRestApi()`, `@PatchRestApi()`.
  - Export tập trung qua `src/decorators/index.ts`.
- **Refactoring toàn bộ Controller (`src/**/*.controller.ts`)**:
  - Thay thế toàn bộ các decorator rời rạc bằng `@GetRestApi()`, `@PostRestApi()`, `@PutRestApi()`, `@DeleteRestApi()`, `@PatchRestApi()`.
  - Xóa bỏ từ khóa `public` thừa thãi trước các action method (`async handler(...)` thay vì `public async handler(...)`).
  - Dọn dẹp tất cả các unused imports liên quan (`Get`, `Post`, `Put`, `Delete`, `Patch`, `Version`, `ApiOperation`, `BaseApiOkResponse`, `HttpCode`, `HttpStatus` nếu không còn dùng).

### Explicit Out-of-Scope:
- **Authentication & Authorization**: `@Auth()`, `@PublicRoute()`, `@Roles()`, `@Permissions()` tiếp tục được giữ độc lập ở cấp Controller hoặc Action riêng biệt để không làm phức tạp hóa options của REST routing.
- **Business Logic & Service Layer**: Giữ nguyên 100% logic xử lý bên trong controller body và các service gọi kèm theo.

---

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### Core Mechanism:
Sử dụng hàm tiện ích `applyDecorators` của `@nestjs/common` để gộp danh sách các decorators chuẩn của NestJS & Swagger theo một thứ tự thực thi đồng nhất.

```typescript
export interface IRestApiOptions {
    path?: string | string[];
    summary?: string;
    description?: string;
    responseDto?: Type<unknown>;
    isArray?: boolean;
    version?: string | string[];
    httpCode?: HttpStatus;
    deprecated?: boolean;
}
```

### Cú pháp sử dụng thực tế (Before vs After):

```typescript
// ❌ Trước đây:
@ApiOperation({ summary: 'Get all features by provider ID' })
@Version('1')
@Get('data-providers/:dataProviderId')
@BaseApiOkResponse(DataProviderFeatureDto, { isArray: true })
public async findByProvider(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderFeatureDto[]> {
    return await this.featureService.getFeaturesByProviderId(dataProviderId);
}

// ✅ Sau khi áp dụng @GetRestApi() và bỏ 'public':
@GetRestApi({
    path: 'data-providers/:dataProviderId',
    summary: 'Get all features by provider ID',
    responseDto: DataProviderFeatureDto,
    isArray: true,
})
async findByProvider(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderFeatureDto[]> {
    return await this.featureService.getFeaturesByProviderId(dataProviderId);
}
```

---

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

1. **Khả năng tương thích Swagger Doc**: Đảm bảo tất cả OpenAPI metadata (`summary`, `description`, `type`, `isArray`, `deprecated`) xuất ra Swagger UI hoàn toàn tương đương hoặc chính xác hơn trước đây.
2. **Các Controller đặc biệt**:
   - `AppController` (Health check hoặc root endpoint có thể không có DTO hoặc version riêng).
   - `AuthController` (`POST /login` hoặc `POST /register` có thể cần `HttpStatus.OK`).
   - Các controller có `FileInterceptor` hoặc decorator đặc thù khác.
