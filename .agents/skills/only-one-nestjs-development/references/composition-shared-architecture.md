# Composition & Shared Architecture

## Trách nhiệm & Vị trí

Composition Root ghép nối các Feature Module vào ứng dụng chính (`AppModule`). Shared Layer cung cấp các abstraction tái sử dụng toàn hệ thống.

- **Vị trí**:
  - Root composition: `AppModule`
  - Base classes: `BaseController`, `BaseService`, `AbstractEntity`
  - Shared module: `SharedModule`

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Tái sử dụng Abstractions chuẩn**:
  - Feature Controllers phải kế thừa `BaseController` để trả về `ResponseDto`.
  - Persistence Services phải kế thừa `BaseService`.
  - Persistence Entities phải kế thừa `AbstractEntity` (UUID, audit timestamps, soft delete).
  - Sử dụng `LoggerService`, `AppError` và custom decorators có sẵn từ hệ thống thay vì tự viết lại abstraction.
- ✅ **Module Ownership Graph**: Import Feature Module vào `AppModule` hoặc Parent Feature Module theo đúng quan hệ phụ thuộc.
- ❌ **Không import ngược**: Không bao giờ import `AppModule` ngược lại vào Feature Module.
- ❌ **Không duplicate base code**: Không copy `BaseService` hay `BaseController` về lại từng feature module.
