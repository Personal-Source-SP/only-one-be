# Service Architecture

## Trách nhiệm & Vị trí

Service sở hữu use case, business rules, persistence orchestration, error mapping và logging.

- **Vị trí**: `src/modules/<feature>/services/<feature>.service.ts`

## Code mẫu

```ts
@Injectable()
export class FeatureService extends BaseService<FeatureEntity> {
  constructor(
    private readonly _em: EntityManager,
    private readonly _logger: LoggerService,
    @InjectMapper() private readonly _mapper: Mapper,
    @InjectRepository(FeatureEntity)
    private readonly _featureRepository: EntityRepository<FeatureEntity>,
  ) {
    super(_featureRepository, _em, _logger, 'FeatureService');
  }

  async getOne(id: string): Promise<FeatureDto> {
    const result = await this.findById({ id, map: (item) => this.mapDto(item) });
    if (!result) throw new NotFoundException(AppError.FeatureNotFound);
    return result;
  }

  private mapDto(entity: FeatureEntity): FeatureDto {
    return this._mapper.map(entity, FeatureEntity, FeatureDto);
  }

  private mapDtoArray(entities: FeatureEntity[]): FeatureDto[] {
    return this._mapper.mapArray(entities, FeatureEntity, FeatureDto);
  }
}
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Cấu trúc & Kế thừa**: Kế thừa `BaseService` cho persistence chuẩn. Sắp xếp thứ tự method: public synchronous -> public asynchronous -> private synchronous -> private asynchronous.
- ✅ **Return bằng biến cụ thể (Debug-friendly Return)**:
  - BẮT BUỘC lưu kết quả xử lý hoặc kết quả `await` vào một biến cụ thể trước khi `return` (ví dụ: `const result = await this.findById(...); return result;`).
  - ❌ **Không** `return await ...` trực tiếp hoặc `return this.someFunction(...)` trực tiếp trên cùng một dòng.
  - *Lý do*: Việc gán vào biến trung gian giúp dễ dàng đặt breakpoint, inspect giá trị trả về trong debugger và thêm log điểm cuối khi bảo trì.
- ✅ **Gom nhóm & Tái sử dụng Code (Refactoring / DRY)**:
  - Khi viết hoặc sửa code, nếu phát hiện các đoạn logic bị lặp lại (ngay cả khi không giống nhau 100% nhưng có chung mô hình/mục đích), BẮT BUỘC chủ động tách và gom lại thành các **`private` method** trong Service để tối ưu code, tăng tính đọc hiểu và giảm trùng lặp.
- ✅ **Sử dụng CRUD mặc định**: Dùng các helper method có sẵn của `BaseService` (`findById`, `createEntity`, `updatePartial`, `deleteEntity`, `findAll`, `findOneByFilter`, `exists`, `count`, `paginate`). Không tự gọi `_em.findOne`/`_em.create`/`_em.flush` trực tiếp ngoại trừ custom persistence đặc biệt.
- ✅ **Mapping**: Tách biệt `mapDto` và `mapDtoArray` bằng AutoMapper.
- ✅ **Xử lý Update (PATCH)**: Dùng `pickDefined` để phân biệt giữa không gửi (`undefined`), gửi `null`, hoặc mảng rỗng `[]`.
- ✅ **Error & i18n**:
  - Mọi error key được throw phải đăng ký trong danh sách `AppError` chuẩn và có bản dịch `i18n` (vi/en).
  - Không throw hardcoded string chưa qua `AppError`.
  - Kiểm tra not-found / conflict / relation guard trước khi thực hiện write/delete.
- ✅ **Parameters & Types**:
  - Parameter dạng object nếu có **từ 3 properties trở lên** bắt buộc phải khai báo `interface` riêng nằm trong folder `types/`, không dùng inline object shape hoặc `Record<string, unknown>`.
  - Không khai báo `interface`/`type` trực tiếp trong file service.
- ✅ **Sử dụng Thư viện Utility (Lodash & Dayjs)**:
  - Xử lý ngày tháng dùng `dayjs`, không dùng `new Date()` với các toán tử so sánh (`<`, `>`, `>=`). Dùng `dayjs.isBefore`, `dayjs.isAfter`, `dayjs.isSame`.
  - **Kiểm tra Timezone chính xác**: Khi xử lý ngày giờ liên quan đến múi giờ địa phương hoặc so sánh UTC (như lịch trình, báo cáo, đếm ngược), BẮT BUỘC kiểm tra sự cần thiết của việc sử dụng các plugin Timezone của Dayjs (`dayjs.extend(utc)`, `dayjs.extend(timezone)`) để đảm bảo tính toán ngày tháng và chuyển đổi múi giờ tuyệt đối chính xác.
  - Khuyến khích ưu tiên sử dụng các method có sẵn từ **`lodash`** (như `isEmpty`, `get`, `set`, `uniq`, `groupBy`, `keyBy`, `cloneDeep`, `omit`, `pick`,...) cho các thao tác biến đổi mảng, object, gom nhóm hay kiểm tra dữ liệu thay vì tự viết lại logic thủ công.
  - Rẽ nhánh enum/union type dùng `switch/case` để compiler kiểm tra đầy đủ các case, không dùng `if/else` lồng nhau.
- ✅ **Transaction & Logging**:
  - Multi-write đòi hỏi tính nguyên tố phải dùng Transaction.
  - Sử dụng Logger của hệ thống dạng `[ServiceName] message`. Không bao giờ log credentials, token, password hoặc sensitive body.
- ❌ **Không dính dáng HTTP**: Không dùng HTTP decorators (`@Body`, `@Query`), Swagger annotations hoặc `ResponseDto` trong Service.
- ❌ **Không nuốt lỗi**: Không wrap `try/catch` toàn bộ service một cách vô căn cứ. Chỉ catch lỗi khi cần translate, recover hoặc log context an toàn.