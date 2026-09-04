# Walkthrough: Triển khai 5 Nhóm Decorators Chuẩn Hoá cho Only-One-BE

Đã hoàn tất chuyển đổi, chuẩn hoá và tích hợp 5 nhóm decorators từ `carwash-api` sang [src/decorators](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators) của `only-one-be`. Toàn bộ các validation liên quan đến String đều được tích hợp tự động `@Trim()`.

## 1. Danh sách các File đã tạo & cập nhật

| Nhóm Decorator | File | Danh sách Decorators / Symbols | Ghi chú & Tính năng nổi bật |
| :--- | :--- | :--- | :--- |
| **1. Transform** | [transform.decorators.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/transform.decorators.ts) | `@Trim()`, `@ToBoolean()`, `@ToInt()`, `@ToArray()`, `@ToLowerCase()`, `@ToUpperCase()`, `@PhoneNumberSerializer()`, `@JSONToObject()`, `@JSONToArray()` | Xử lý sanitize, cast kiểu và chuẩn hoá input query/body |
| **2. Validator** | [validator.decorators.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/validator.decorators.ts) | `@IsPhoneNumber()`, `@IsTmpKey()`, `@IsUndefinable()`, `@IsNullable()`, `@IsPassword()` | Custom validators cho số điện thoại (VN), mật khẩu, temporary keys |
| **3. Property** | [property.decorators.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/property.decorators.ts) | `@ApiBooleanProperty()`, `@ApiUUIDProperty()`, `@ApiEnumProperty()`, `getVariableName()` (kèm các bản `*Optional`) | Tự động sinh Swagger OpenAPI metadata chuẩn xác |
| **4. Field** | [field.decorators.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/field.decorators.ts) | `@StringField()`, `@NumberField()`, `@BooleanField()`, `@EnumField()`, `@DateField()`, `@UUIDField()`, `@URLField()`, `@EmailField()`, `@PhoneField()`, `@ClassField()` (kèm các bản `*Optional`) | Gom gọn `Swagger + class-validator + class-transformer` vào 1 dòng. **Tự động áp dụng `@Trim()` cho mọi kiểu string/email/phone/uuid/url/enum**. |
| **5. HTTP & RBAC** | [http.decorators.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/http.decorators.ts), [public-route.decorator.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/public-route.decorator.ts), [roles.decorator.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/roles.decorator.ts), [permissions.decorator.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/permissions.decorator.ts) | `@Auth()`, `@UUIDParam()`, `@PublicRoute()`, `@Roles()`, `@Permissions()`, `@Permission()` | Chuẩn hoá Auth Guard, Bearer Auth, Bypass Public và phân quyền RBAC |
| **Barrel Export** | [index.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/decorators/index.ts) | Re-export toàn bộ decorators | Tương thích ngược 100% với `@BaseResponse`, `@User`, `@ApiFile` |

---

## 2. Kết quả Xác thực (Verification Results)

### TypeScript Compilation & Build
- Lệnh thực thi: `npm run build`
- Trạng thái: ✅ **PASS** (Exit code 0, không có bất kỳ lỗi cú pháp hoặc thiếu type).

### ESLint & Prettier
- Lệnh thực thi: `ESLINT_USE_FLAT_CONFIG=false npx eslint "src/decorators/**/*.ts"`
- Trạng thái: ✅ **PASS** (0 errors, 0 warnings, tuân thủ 100% code style).

---

## 3. Hướng dẫn Sử dụng Mẫu (Usage Examples)

### Trong DTO:
```typescript
import {
    StringField,
    StringFieldOptional,
    NumberField,
    NumberFieldOptional,
    BooleanField,
    EnumField,
    UUIDField,
    EmailField,
    PhoneField,
} from 'src/decorators';

export class ExampleDto {
    @StringField({ minLength: 3, maxLength: 50, toLowerCase: true })
    name: string; // Tự động @Trim(), @IsString(), @MinLength(3), @MaxLength(50), Swagger ApiProperty

    @EmailField()
    email: string; // Tự động @Trim(), @IsEmail(), toLowerCase, Swagger ApiProperty

    @PhoneFieldOptional()
    phoneNumber?: string; // Tự động @Trim(), @IsPhoneNumber(), PhoneNumberSerializer

    @UUIDField()
    userId: string; // Tự động @Trim(), @IsUUID('4'), Swagger format uuid

    @NumberField({ min: 1, max: 100, int: true })
    age: number; // Tự động @Type(() => Number), @IsInt(), @Min(1), @Max(100)
}
```

### Trong Controller:
```typescript
import { Controller, Get } from '@nestjs/common';
import { Auth, UUIDParam, PublicRoute } from 'src/decorators';

@Controller('users')
export class UserController {
    @Get(':id')
    @Auth({ roles: ['admin'] }) // Tự động gắn JwtAuthGuard, @ApiBearerAuth(), @Roles('admin')
    getUser(@UUIDParam('id') id: string) {
        return { id };
    }

    @Get('public/health')
    @PublicRoute() // Đánh dấu endpoint công khai
    healthCheck() {
        return { status: 'ok' };
    }
}
```
