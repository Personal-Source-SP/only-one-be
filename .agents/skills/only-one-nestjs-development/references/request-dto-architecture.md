# Request DTO Architecture

## Trách nhiệm & Vị trí

Request DTO định nghĩa input contract và validation rules tại HTTP boundary.

- **Vị trí**: `src/modules/<feature>/dtos/requests/`

## Code mẫu

```ts
import { AutoMap } from '@automapper/classes';

export class CreateFeatureRequest {
  @AutoMap()
  @StringField({ minLength: 1, maxLength: 255 })
  @Trim()
  name!: string;

  @AutoMap()
  @BooleanFieldOptional()
  enabled?: boolean;
}

export class UpdateFeatureRequest {
  @AutoMap()
  @StringFieldOptional({ minLength: 1, maxLength: 255 })
  @Trim()
  name?: string;
}
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Phân tách Contracts**: Tách biệt rõ ràng các DTO cho `Create`, `Update`, và `Query/List`.
- ✅ **Custom Validation Decorators**:
  - Sử dụng bộ decorator wrapper của hệ thống: `@StringField`, `@StringFieldOptional`, `@NumberFieldOptional`, `@BooleanFieldOptional`, `@EnumFieldOptional`, `@DateFieldOptional`, `@Trim`.
  - Mọi string field phải dùng `@Trim()` và giới hạn `minLength`/`maxLength` rõ ràng.
  - Chỉ dùng `class-validator` trực tiếp cho các trường hợp wrapper chưa hỗ trợ (ví dụ: `@ArrayMinSize`, `@ArrayUnique`).
- ✅ **Thứ tự Property**: Sắp xếp **Required fields** trước -> **Optional fields** sau. Không chèn optional field vào giữa nhóm required fields.
- ✅ **AutoMapper Binding**: Các field trong `Create`/`Update` DTO cần map sang Entity phải gắn `@AutoMap()`. Query/List DTO không map sang Entity nên không cần `@AutoMap()`.
- ❌ **Không phụ thuộc Domain/DB State**:
  - Không import Entity/Repository/Service vào DTO.
  - Không đặt các validation phụ thuộc DB state hiện tại vào DTO (việc kiểm tra DB state phải thực hiện ở Service).
  - Không dùng Entity làm Request DTO.
