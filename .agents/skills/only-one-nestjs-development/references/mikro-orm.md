# MikroORM Reference

## Trách nhiệm & Vị trí

Quy chuẩn tích hợp và sử dụng **MikroORM** trong NestJS cho Persistence Layer và Transaction Management.

- **Vị trí**: Sử dụng tại các `Service`, `Entity`, và `Profile` trong `src/modules/<feature>/`

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Khai báo Module & Injection**:
  - Khai báo Entity trong `MikroOrmModule.forFeature([FeatureEntity])` tại `imports` của Feature Module.
  - Inject Repository thông qua `@InjectRepository(FeatureEntity)` và `EntityManager` qua `_em: EntityManager` trong Service constructor.
- ✅ **Tái sử dụng BaseService CRUD**:
  - Ưu tiên sử dụng các helper methods chuẩn của `BaseService` (`findById`, `createEntity`, `updatePartial`, `deleteEntity`, `findAll`, `findOneByFilter`, `exists`, `count`, `paginate`).
  - **Không** tự gọi `_em.findOne`, `_em.find`, `_em.create`, `_em.persist`, `_em.flush` trực tiếp cho các thao tác CRUD cơ bản trừ các xử lý custom persistence đặc biệt.
- ✅ **Xử lý Transaction (Tính nguyên tố)**:
  - Multi-write operations đòi hỏi tính nguyên tố phải bọc trong transaction: `await this._em.transactional(async (em) => { ... })`.
  - Giữ phạm vi transaction ngắn nhất có thể. **Không** gọi API bên ngoài hay thực hiện tác vụ I/O/network bên trong transaction.
- ✅ **Kiểm tra Uninitialized Relations**:
  - Quan hệ chưa `populate` trong MikroORM ở trạng thái uninitialized.
  - Kiểm tra `wrap(relation).isInitialized()` với relation đơn hoặc `collection.isInitialized()` với collection trước khi truy cập hoặc map DTO để tránh lỗi Lazy Loading ngầm / N+1 Query.
- ✅ **Exception Handling**:
  - Bắt các lỗi vi phạm unique constraint (`UniqueConstraintViolationException`) hoặc missing record từ ORM và map sang `AppError` tương ứng.
  - **Không** để lọt nguyên văn exception thô của DB/MikroORM ra HTTP Response.
