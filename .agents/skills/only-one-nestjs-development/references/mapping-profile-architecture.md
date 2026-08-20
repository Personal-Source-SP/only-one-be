# Mapping Profile Architecture

## Trách nhiệm & Vị trí

AutoMapper Profile đăng ký chuyển đổi dữ liệu tập trung giữa Request DTO, Entity và Response DTO. Profile quyết định **shape dữ liệu**, Service quyết định **populate relation nào**.

- **Vị trí**: `src/modules/<feature>/profiles/<feature>.profile.ts`

## Code mẫu

```ts
@Injectable()
export class FeatureProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  get profile(): MappingProfile {
    return (mapper) => {
      createMap(
        mapper,
        FeatureEntity,
        FeatureDto,
        forMember(
          (dest) => dest.owner,
          mapWith(OwnerDto, OwnerEntity, (src) =>
            src.owner && wrap(src.owner).isInitialized() ? src.owner : null,
          ),
        ),
        forMember(
          (dest) => dest.items,
          mapWith(ItemDto, ItemEntity, (src) =>
            src.items?.isInitialized() ? src.items.getItems() : [],
          ),
        ),
      );

      createMap(mapper, CreateFeatureRequest, FeatureEntity);
      createMap(mapper, UpdateFeatureRequest, FeatureEntity);
    };
  }
}
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Khai báo Module**: Profile phải có `@Injectable()`, extends `AutomapperProfile` và được khai báo trong `providers` của Feature Module.
- ✅ **Xử lý Relations an toàn cho MikroORM (Uninitialized Guards)**:
  - Khi làm việc với **MikroORM**, các quan hệ (relations) chưa được `populate` sẽ ở trạng thái uninitialized. Cần kiểm tra kỹ trước khi map để tránh N+1 Query hoặc Serialization crash:
    - **Relation đơn**: Dùng `mapWith()`, kiểm tra `wrap(relation).isInitialized()`. Chưa populate trả về `null`.
    - **Collection relation**: Kiểm tra `collection.isInitialized()`. Chưa populate trả về `[]`.
- ✅ **Computed Fields**: Dùng `forMember` + `mapFrom`. Chỉ tính toán dựa trên dữ liệu đã load sẵn trong memory, không query DB trong profile.
- ✅ **Thứ tự đăng ký Map**: Đăng ký nested mapping trước khi đăng ký parent mapping nếu parent DTO phụ thuộc nested DTO.
- ❌ **Không chứa Business Rule hay Query DB**: Không query DB, gọi API bên ngoài hoặc thực hiện validation trong mapping profile.
- ❌ **Không gây Lazy Loading ngoài ý muốn**: Không truy cập relation chưa initialize khiến ORM tự kích hoạt N+1 query hoặc bắn lỗi serialization.
