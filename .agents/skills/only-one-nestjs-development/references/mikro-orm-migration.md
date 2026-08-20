# MikroORM Migration Reference

## Trách nhiệm & Vị trí

Tài liệu hướng dẫn quy trình tạo (generate), kiểm tra (review) và thực thi (run/revert) Database Migration bằng MikroORM CLI khi có thay đổi cấu trúc Entity / DB Schema.

> [!CAUTION]
> **QUY TẮC AN TOÀN TUYỆT ĐỐI (AGENT RESTRICTION)**:
> Agent **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ ĐỘNG CHẠY MIGRATION** (các lệnh `migration:run`, `migration:up`, `migration:revert`, `migration:down` hoặc biến đổi trực tiếp DB schema).
> - **Nhiệm vụ của Agent**: Cập nhật Entity code, sinh file migration mới (`migration:create`), và review nội dung file SQL/TS.
> - **Nhiệm vụ của Người Dùng (Human User)**: Tự chạy thủ công các lệnh thực thi migration (`migration:run` / `migration:revert`) sau khi đã xem xét file script do Agent tạo.

- **Vị trí file migration**: `src/database/migrations/`
- **Định dạng file sinh ra**: `Migration<YYYYMMDDHHMMSS>_<PascalCaseName>.ts`

## Quy trình Thực hiện Migration 5 Bước

### 1. Thay đổi hoặc Tạo mới Entity (Agent thực hiện)
Cập nhật file Entity (`src/modules/<feature>/entities/<noun>.entity.ts`) đảm bảo đầy đủ:
- Decorator `@Entity()`, `@Property({ length: ... })`, `@Unique()`,...
- Định nghĩa đúng Data type, default value, nullable status và Foreign Key relations.

### 2. Sinh File Migration Tự Động (Agent thực hiện)
Chạy lệnh CLI để MikroORM so sánh sự chênh lệch giữa Entity trong code và DB Schema hiện tại:
```bash
npm run migration:create -- --name=AddAds
```
*(Hoặc `npx mikro-orm migration:create --name=AddAdsMediaKey`)*

> **Quy chuẩn Đặt Tên Migration (`--name`)**:
> Đặt tên dạng **`PascalCase`** theo đúng convention hiện tại của dự án:
> - **Tạo bảng mới:** `Add<EntityPlural>` (Ví dụ: `AddBanners`, `AddVehicles`, `AddNotificationTemplates`)
> - **Thêm cột mới:** `Add<Entity><ColumnName>` (Ví dụ: `AddStationContactPhone`, `AddWashModeFeaturesColumn`, `AddPaymentTransactionExpires`)
> - **Cập nhật bảng/cột:** `Update<Entity><Detail>` (Ví dụ: `UpdateAuditLogs`, `UpdateOrdersVehicle`)
> - **Đổi tên:** `Rename<OldName>To<NewName>` (Ví dụ: `RenameCarModelsToVehicleModels`, `RenameVehiclesToUserVehicles`)
> - **Thay thế/Refactor:** `Replace<Detail>` (Ví dụ: `ReplaceGatewayPaymentMethod`)
> - ❌ **Không** dùng tên mập mờ, chung chung như `update`, `migration1`, `temp`, `fix`.

### 3. Review File Migration Vừa Tạo (Agent & User cùng review)
Sau khi file migration mới được sinh trong `src/database/migrations/`:
- **BẮT BUỘC** mở file (`view_file`) kiểm tra các câu lệnh SQL trong `up()` và `down()`.
- Kiểm tra kĩ: tên cột, kiểu dữ liệu, độ dài string (`varchar(length)`), chỉ mục (indexes), ràng buộc duy nhất (unique constraint) và khóa ngoại (foreign key).
- Kiểm tra tính khôi phục: Hàm `down()` phải có các câu lệnh rollback ngược lại hoàn toàn so với `up()`.

### 4. Thực Thi Migration (NGƯỜI DÙNG THỦ CÔNG CHẠY)
Người dùng kiểm tra file migration script và tự thực thi dưới terminal:
```bash
npm run migration:run
```
*(Hoặc `npx mikro-orm migration:up`)*

### 5. Rollback (NGƯỜI DÙNG THỦ CÔNG CHẠY KHI CẦN THIẾT)
Nếu người dùng phát hiện lỗi hoặc cần hoãn thay đổi trên DB:
```bash
npm run migration:revert
```
*(Hoặc `npx mikro-orm migration:down`)*

---

## Quy chuẩn thực thi (Guidelines & Rules)

- ❌ **CẤM AGENT TỰ CHẠY MIGRATION**: Agent **không bao giờ** được tự ý gọi `npm run migration:run` hoặc `npm run migration:revert`. Bắt buộc phải để người dùng tự tay thực thi.
- ✅ **Đặt Tên Migration Chuẩn (`PascalCase`)**: Luôn sử dụng `--name=<PascalCaseName>` theo convention thực tế của dự án (`AddBanners`, `AddStationContactPhone`, `UpdateOrdersVehicle`, `RenameCarModelsToVehicleModels`).
- ✅ **Review trước khi Thông Báo**: Agent phải mở file migration vừa tạo ra để kiểm tra toàn bộ SQL queries trong `up()` và `down()` trước khi thông báo cho người dùng.
- ✅ **Phép Gán Biến & Return**: Khi viết custom migration script thủ công bằng TypeScript, lưu kết quả truy vấn vào biến trước khi `return`.
- ✅ **Partial Unique Index cho Soft Delete**: Với các Entity sử dụng Soft Delete, Unique Index trong migration phải là Partial Unique Index có điều kiện `WHERE deleted_at IS NULL`.
- ❌ **Tránh Breaking Change dữ liệu Production**:
  - Không tự ý sinh migration chứa lệnh `DROP TABLE` hoặc `DROP COLUMN` trên các bảng đang có dữ liệu production mà chưa có kế hoạch deprecation.
  - Khi đổi tên cột, ưu tiên tạo cột mới -> migrate dữ liệu -> xóa cột cũ (Multi-step migration).
- ❌ **Cấm sửa Migration đã commit/chạy trên Prod**: Tuyệt đối không sửa trực tiếp nội dung file migration đã được commit hoặc chạy trên môi trường dùng chung. Khi cần thay đổi, tạo thêm 1 file migration mới.
