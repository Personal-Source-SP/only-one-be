---
id: 20260907-214608-standardized-custom-decorators-suite
title: Standardized Custom Decorators Suite, Composite REST APIs & Full Modular Refactor
archived_at: 2026-09-07
status: active
references: []
affected_modules:
  - decorators
  - modules/auth
  - modules/user
  - modules/setting
  - modules/audit-log
  - modules/data-provider
  - modules/schedule
  - modules/google
  - modules/simulation
  - modules/cloud-data
  - modules/import-data
  - modules/notification
  - modules/queue
---

# Archive: Standardized Custom Decorators Suite, Composite REST APIs & Full Modular Refactor

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: Các DTO và Controller trong hệ thống trước đây phải khai báo thủ công nhiều decorators rời rạc (`@ApiProperty`, `@IsString`, `@IsNotEmpty`, `@Trim`, `@IsOptional`, `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`, `@Get()`, `@ApiOperation()`, `@ApiResponse()`, `@Param('id', new ParseUUIDPipe())`). Cách làm này gây trùng lặp boilerplate, không đảm bảo auto-trimming đồng nhất cho chuỗi dữ liệu đầu vào và phân mảnh cơ chế gán metadata xác thực/OpenAPI.
- **Giá trị (Value)**: Xây dựng bộ **6 nhóm Decorators Chuẩn Hoá** (`Transform`, `Validator`, `Property`, `Field`, `HTTP & RBAC`, `REST API Endpoint`) tại `src/decorators/` và tái cấu trúc toàn diện 100% các modules của `only-one-be`. Mọi string field đều được tích hợp tự động `@Trim()`, gom gọn logic validation + OpenAPI schema + transformation vào 1 dòng khai báo duy nhất và chuẩn hoá guard/param/endpoint controller qua `@Auth()`, `@UUIDParam()`, `@GetRestApi()`, `@PostRestApi()`, `@PutRestApi()`, `@DeleteRestApi()`, `@PatchRestApi()`.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **6 Nhóm Decorators Phân tầng (`src/decorators/`)**:
  1. **Transform (`transform.decorators.ts`)**: `@Trim`, `@ToBoolean`, `@ToInt`, `@ToArray`, `@ToLowerCase`, `@ToUpperCase`, `@PhoneNumberSerializer`, `@JSONToObject`, `@JSONToArray`.
  2. **Custom Validator (`validator.decorators.ts`)**: `@IsPhoneNumber` (E.164 / VN format), `@IsTmpKey`, `@IsUndefinable`, `@IsNullable`, `@IsPassword`.
  3. **Property (`property.decorators.ts`)**: OpenAPI/Swagger builders (`@ApiBooleanProperty`, `@ApiUUIDProperty`, `@ApiEnumProperty`).
  4. **Field (`field.decorators.ts`)**: Composite decorators kết hợp Swagger + `class-validator` + `class-transformer` + auto-trim (`@StringField`, `@NumberField`, `@BooleanField`, `@EnumField`, `@DateField`, `@UUIDField`, `@URLField`, `@EmailField`, `@PhoneField`, `@PasswordField`, `@ClassField`, `@ObjectFieldOptional`).
  5. **HTTP & RBAC (`http.decorators.ts`, `public-route.decorator.ts`, `roles.decorator.ts`, `permissions.decorator.ts`)**: `@Auth()`, `@UUIDParam()`, `@PublicRoute()`, `@Roles()`, `@Permissions()`.
  6. **REST API Endpoint (`rest-api.decorator.ts`)**: Composite route + OpenAPI decorators (`@GetRestApi`, `@PostRestApi`, `@PutRestApi`, `@DeleteRestApi`, `@PatchRestApi`) tự động liên kết HTTP method, route path, summary, response DTO schema (`responseDto`, `isArray`, `status`, `description`), và Swagger response typing.
- **Barrel Export (`src/decorators/index.ts`)**: Cung cấp điểm truy cập thống nhất cho toàn bộ hệ thống decorators.
- **100% Modular Migration**: Refactor toàn bộ DTOs và Controllers trên toàn hệ thống tuân thủ nghiêm ngặt bộ decorator chuẩn.

```mermaid
graph TD
    subgraph DTO Composite Layer
        FD["field.decorators.ts (@StringField, @NumberField...)"]
        PD["property.decorators.ts (@ApiEnumProperty, @ApiUUIDProperty...)"]
        TD["transform.decorators.ts (@Trim, @ToBoolean...)"]
        VD["validator.decorators.ts (@IsNullable, @IsPassword...)"]
        FD --> PD
        FD --> TD
        FD --> VD
    end

    subgraph Controller HTTP & Endpoint Layer
        RAD["rest-api.decorator.ts (@GetRestApi, @PostRestApi...)"]
        HD["http.decorators.ts (@Auth, @UUIDParam)"]
        PR["public-route.decorator.ts (@PublicRoute)"]
        RD["roles.decorator.ts (@Roles)"]
        PM["permissions.decorator.ts (@Permissions)"]
        HD --> PR
        HD --> RD
        HD --> PM
    end

    subgraph Module Adoption
        Controllers["Module Controllers (@Auth, @UUIDParam, @*RestApi)"]
        DTOs["Module Request DTOs (@*Field, Auto-Trim)"]
        Controllers --> HD
        Controllers --> RAD
        DTOs --> FD
    end
```

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [rest-api.decorator.ts](file:///d:/Sources/PERSONAL/only-one-be/src/decorators/rest-api.decorator.ts): Toàn bộ composite REST API endpoint decorators.
- [field.decorators.ts](file:///d:/Sources/PERSONAL/only-one-be/src/decorators/field.decorators.ts): Toàn bộ composite field decorators.
- [transform.decorators.ts](file:///d:/Sources/PERSONAL/only-one-be/src/decorators/transform.decorators.ts): Các transformer tiện ích và serializers.
- [validator.decorators.ts](file:///d:/Sources/PERSONAL/only-one-be/src/decorators/validator.decorators.ts): Custom validators.
- [property.decorators.ts](file:///d:/Sources/PERSONAL/only-one-be/src/decorators/property.decorators.ts): Swagger property decorators.
- [http.decorators.ts](file:///d:/Sources/PERSONAL/only-one-be/src/decorators/http.decorators.ts): `@Auth` và `@UUIDParam`.
- [index.ts](file:///d:/Sources/PERSONAL/only-one-be/src/decorators/index.ts): Barrel export toàn hệ thống.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **TypeScript Compilation**: `npm run build` $\rightarrow$ Exit Code 0 (0 errors).
- **ESLint & Prettier**: 100% Clean, tuân thủ nghiêm ngặt code styles.
