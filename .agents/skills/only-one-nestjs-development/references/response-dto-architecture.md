# Response DTO Architecture

## Trách nhiệm & Vị trí

Response DTO định nghĩa cấu trúc dữ liệu đầu ra công khai của API, phục vụ serialization và OpenAPI/Swagger documentation.

- **Vị trí**: `src/modules/<feature>/dtos/responses/` (hoặc `dtos/<noun>.dto.ts`)

## Code mẫu

```ts
export class FeatureDto extends AbstractDto {
  @StringField({ minLength: 1, maxLength: 255 })
  @AutoMap()
  name!: string;

  @ClassField(() => FeatureItemDto, { each: true, isArray: true })
  @AutoMap(() => [FeatureItemDto])
  items!: FeatureItemDto[];

  constructor(partial?: Partial<FeatureDto>) {
    super();
    Object.assign(this, partial);
  }
}
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Kế thừa & Constructor**:
  - Extend `AbstractDto` cho các DTO đại diện cho Entity có ID/audit metadata.
  - Phải có constructor dạng: `constructor(partial?: Partial<FeatureDto>) { super(); Object.assign(this, partial); }`. Giữ `partial` là optional để AutoMapper khởi tạo được DTO không tham số.
- ✅ **Nested DTOs**: Dùng `@ClassField()` hoặc `@ClassFieldOptional()` cho các property dạng nested DTO.
- ❌ **Không trả Entity thô**: Tuyệt đối không trả Entity trực tiếp ra HTTP Response.
- ❌ **Không lộ thông tin nhạy cảm**: Không bao giờ expose thông tin secret, internal audit fields nếu contract không yêu cầu.
- ❌ **Tránh Mapper tham chiếu vòng**: Không tạo quan hệ tham chiếu vòng giữa các DTOs (ví dụ: `ParentDto -> ChildDto -> ParentDto`) gây tràn bộ nhớ (stack overflow) hoặc response vô hạn.
