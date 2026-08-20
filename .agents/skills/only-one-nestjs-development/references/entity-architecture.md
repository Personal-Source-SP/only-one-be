# Entity Architecture (MikroORM)

## Trách nhiệm & Vị trí

Entity map domain persistence sang ORM table, columns, indexes và relations.

> [!NOTE]
> Quy chuẩn Entity trong file này tập trung dành riêng cho **MikroORM** (sử dụng decorators và types từ `@mikro-orm/core` như `@Entity`, `@Property`, `@ManyToOne`, `@OneToMany`, `Collection`,...).

- **Vị trí**: `src/modules/<feature>/entities/<noun>.entity.ts`

## Code mẫu

```ts
import { AutoMap } from '@automapper/classes';
import { Collection, Entity, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'features' })
@Unique({ properties: ['code'], options: { cond: { deletedAt: null } } })
export class FeatureEntity extends AbstractEntity {
  @Property({ length: 100 })
  @AutoMap()
  code!: string;

  @Property({ default: true })
  @AutoMap()
  enabled = true;

  // ManyToOne (Owning Side): Giữ FK category_id trong bảng features
  @ManyToOne(() => CategoryEntity, { nullable: true, deleteRule: 'set null' })
  category?: CategoryEntity;

  @AutoMap()
  get categoryId(): string | undefined {
    return this.category?.id;
  }

  // OneToMany (Inverse Side): Tập hợp danh sách items thuộc feature này
  @OneToMany(() => FeatureItemEntity, (item) => item.feature, {
    orphanRemoval: true,
  })
  items = new Collection<FeatureItemEntity>(this);
}
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Kế thừa & Đặt tên**:
  - Kế thừa `AbstractEntity` (UUID, audit fields, soft-delete filter).
  - Tên Class dùng `PascalCase` (`FeatureEntity`); tên property dùng `camelCase`; tên bảng/cột map sang `snake_case`.
  - Tên Entity phải phản ánh Ubiquitous Language của Domain context, tránh các từ generic như `DataEntity`, `ItemEntity`.
- ✅ **Thứ tự sắp xếp Property**: Required scalar fields -> Nullable scalar fields -> Relations.
- ✅ **Data Types & Constraints**:
  - Mọi `string` field phải khai báo `length` cụ thể (VD: code `length: 100`, name `length: 255`). Dùng `type: 'text'` cho nội dung không giới hạn.
  - Thêm DB unique constraints / partial indexes phù hợp cho các dữ liệu nhạy cảm race-condition.
- ✅ **AutoMapper Decorators**:
  - Thêm `@AutoMap()` cho scalar fields cần map sang DTO.
  - Relation mặc định **không** gắn `@AutoMap()`.
  - Với `ManyToOne`: Mỗi relation phải cung cấp getter ID có `@AutoMap()` (ví dụ: `@AutoMap() get categoryId(): string { return this.category?.id; }`).
  - Với `OneToMany`: Chỉ gắn `@AutoMap(() => [ChildDto])` khi DTO contract bắt buộc trả về danh sách nested items.
- ✅ **Quy định quan hệ (Relations)**:
  - **`ManyToOne` (Owning Side)**: Bảng hiện tại giữ Foreign Key (`FK`). Khai báo `deleteRule` phù hợp (`cascade`, `set null`, hoặc `restrict`).
  - **`OneToMany` (Inverse Side)**:
    - Luôn khởi tạo với `new Collection<ChildEntity>(this)`.
    - Trỏ tới field `ManyToOne` tương ứng ở Child Entity: `@OneToMany(() => ChildEntity, (child) => child.parent)`.
    - Dùng `orphanRemoval: true` khi Child Entity không có lifecycle độc lập và tự động bị xóa khi gỡ khỏi Collection.
    - Trong Service / AutoMapper Profile: Luôn kiểm tra `collection.isInitialized()` trước khi gọi `.getItems()` để tránh lỗi Lazy Loading hoặc N+1 query.
  - **`ManyToMany`**: Chỉ dùng khi bảng trung gian không chứa thuộc tính business. Nếu bảng trung gian có thuộc tính như `createdAt`, `status`, `position`, phải tách thành Entity trung gian riêng với 2 quan hệ `ManyToOne`.
  - **`OneToOne`**: Chỉ dùng khi domain quy định tuyệt đối tối đa 1 record. Owning side khai báo `owner: true` giữ FK unique.
- ❌ **Không trộn lẫn trách nhiệm**: Không dùng Entity làm Request/Response DTO, không đưa logic Controller/Service/HTTP vào Entity.
- ❌ **Không bỏ qua DB Constraints**: Không được bỏ qua Unique/Index ở DB chỉ vì Service đã thực hiện validation.
