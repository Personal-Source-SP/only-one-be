---
id: 20260909-152000-standardized-custom-decorators-suite
title: Chuẩn hóa Bộ Decorator REST API, Field Validation & Swagger Suite
archived_at: 2026-09-09
status: active
references: []
affected_modules:
  - src/decorators/
  - src/modules/**
---

# Archive: Chuẩn hóa Bộ Decorator REST API, Field Validation & Swagger Suite

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: 
  - Các DTO và Controller trước đây phải khai báo thủ công nhiều decorators rời rạc (`@ApiProperty`, `@IsString`, `@IsNotEmpty`, `@Trim`, `@IsOptional`, `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`, `@Param('id', new ParseUUIDPipe())`).
  - Khi một endpoint trả về mảng, developer phải truyền cả 2 thuộc tính `responseDto: FooDto` và `isArray: true`, dễ dẫn đến quên cờ `isArray` làm sai lệch schema Swagger/OpenAPI.
  - Tên decorator cũ `@GetRestApi`, `@PostRestApi` dài dòng và dễ gây nhầm lẫn với decorator từ `@nestjs/common`.
- **Giá trị (Value)**:
  - Xây dựng bộ **6 nhóm Decorators Chuẩn Hoá** (`Transform`, `Validator`, `Property`, `Field`, `HTTP & RBAC`, `REST API Endpoint`) tại `src/decorators/`.
  - Hỗ trợ khai báo trực quan `responseDto: [UserDto]` tự động bật `isArray: true`.
  - Tinh gọn tên decorator thành `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` với `@Auth()`, `@UUIDParam()`, áp dụng 100% các controller trên toàn hệ thống.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **6 Nhóm Decorators Phân tầng (`src/decorators/`)**:
  1. **Transform (`transform.decorators.ts`)**: `@Trim`, `@ToBoolean`, `@ToInt`, `@ToArray`, `@ToLowerCase`, `@ToUpperCase`, `@PhoneNumberSerializer`, `@JSONToObject`, `@JSONToArray`.
  2. **Custom Validator (`validator.decorators.ts`)**: `@IsPhoneNumber` (E.164 / VN format), `@IsTmpKey`, `@IsUndefinable`, `@IsNullable`, `@IsPassword`.
  3. **Property (`property.decorators.ts` / `api-property.decorator.ts`)**: OpenAPI/Swagger builders, `BaseApiOkResponse` tự động bóc tách `Type<unknown>[]` để gán `isArray: true`.
  4. **Field (`field.decorators.ts`)**: Composite decorators kết hợp Swagger + `class-validator` + `class-transformer` + auto-trim (`@StringField`, `@NumberField`, `@BooleanField`, `@EnumField`, `@DateField`, `@UUIDField`, `@URLField`, `@EmailField`, `@PhoneField`, `@PasswordField`, `@ClassField`, `@ObjectFieldOptional`).
  5. **HTTP & RBAC (`http.decorators.ts`, `public-route.decorator.ts`, `roles.decorator.ts`, `permissions.decorator.ts`)**: `@Auth()`, `@UUIDParam()`, `@PublicRoute()`, `@Roles()`, `@Permissions()`.
  6. **REST API Endpoint (`http-route.decorator.ts`)**: Composite route + OpenAPI decorators `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` tự động liên kết HTTP method, route path, summary, response DTO schema hỗ trợ cả `Dto` và `[Dto]`.
- **Barrel Export (`src/decorators/index.ts`)**: Cung cấp điểm truy cập thống nhất cho toàn bộ hệ thống decorators.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [http-route.decorator.ts](file:///d:/Sources/Personal/only-one-be/src/decorators/http-route.decorator.ts): Định nghĩa `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`.
- [api-property.decorator.ts](file:///d:/Sources/Personal/only-one-be/src/decorators/api-property.decorator.ts): Hỗ trợ mảng DTO tự động.
- [field.decorators.ts](file:///d:/Sources/Personal/only-one-be/src/decorators/field.decorators.ts): Bộ composite DTO decorators.
- [index.ts](file:///d:/Sources/Personal/only-one-be/src/decorators/index.ts): Barrel export trung tâm.
- Refactor 100% DTOs và 28 Controllers trên toàn bộ codebase.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Trạng thái Build & Test**: 100% Passed.
- **Linter**: 0 errors, 0 warnings.
