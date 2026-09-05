# Concept: Chuẩn Hóa Modular Error Code & Exception Handling (only-one-be)

## 1. Problem & Goal (Vấn đề & Mục tiêu)
- **Problem**: Hiện tại trong codebase `only-one-be`, nhiều module (`data-provider`, `simulation`, `schedule`, `auth`, `cloud-data`, `worker`...) đang throw trực tiếp các built-in exception của NestJS (như `BadRequestException`, `NotFoundException`, `InternalServerErrorException`) hoặc `Error` kèm chuỗi text hardcoded. Điều này dẫn đến cấu trúc phản hồi lỗi không đồng nhất, thiếu error code chuẩn hóa và khó hỗ trợ đa ngôn ngữ (i18n / localization) hoặc xử lý client-side error mapping ở frontend.
- **Goal**: Chuẩn hóa toàn bộ cơ chế throw lỗi trong backend sang kiến trúc **Modular Error Code**:
  - `src/constant/error-code.ts` đóng vai trò là **Common System Errors** (`AppError`).
  - Mỗi domain module trong `src/modules/<module-name>/constants/` sẽ sở hữu file error constant riêng (ví dụ: `data-provider-error.ts`, `simulation-error.ts`, `auth-error.ts`...) triển khai theo chuẩn `IAppError`.
  - Toàn bộ exception nghiệp vụ được ném thông qua `throw new AppException(<DomainError>)`, tương thích 100% với `AllExceptionsFilter`.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

### In-Scope
- **Common Errors Refinement**: Rà soát và hoàn thiện [src/constant/error-code.ts](file:///d:/Sources/Personal/only-one-be/src/constant/error-code.ts) cho các mã lỗi hệ thống chung (system, auth, validation, database).
- **Module-Specific Error Constants**: Tạo các hằng số lỗi chuẩn hóa trong thư mục `src/modules/<module-name>/constants/` cho các module chính:
  - `data-provider` (ví dụ: `DataProviderError.FeatureAlreadyExists`, `DataProviderError.SessionNotFound`...)
  - `simulation` (ví dụ: `SimulationError.ExecutionFailed`, `SimulationError.BrowserLaunchFailed`...)
  - `schedule` (ví dụ: `ScheduleError.JobNotFound`, `ScheduleError.CronInvalid`...)
  - `cloud-data` (ví dụ: `CloudDataError.ProviderUnavailable`...)
  - `auth` & `user` (ví dụ: `AuthError.InvalidCredentials`, `UserError.UserNotFound`...)
  - `google` & `import-data` (ví dụ: `GoogleError.DriveAuthFailed`...)
- **Refactoring Throw Statements**: Thay thế toàn bộ `throw new BadRequestException(...)`, `throw new NotFoundException(...)`, `throw new Error(...)` ở layer Services, Controllers, Runners, Helpers sang `throw new AppException(...)`.
- **Parameterization Support**: Chuyển các error message có chứa biến động thành các factory function trả về `IAppError` kèm thuộc tính `params` để hỗ trợ frontend tracking và i18n.

### Explicit Out-of-Scope
- **Frontend Localization Layer**: Việc triển khai translation dictionary trên frontend (`only-one-fe`) sẽ được thực hiện ở task riêng.
- **WebSocket Protocol Exceptions**: Các event gateway exception đặc thù của Socket.io (`WsException`) sẽ giữ nguyên giao thức bắt lỗi riêng nếu không đi qua HTTP Adapter.
- **Thay đổi Database Schema / Migrations**: Không tác động đến cấu trúc cơ sở dữ liệu.

---

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### Architectural Options Considered

| Phương án | Ưu điểm | Nhược điểm | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Option 1: Centralized Monolith (`error-code.ts` duy nhất)** | Dễ tìm kiếm tại một nơi. | File sẽ bị phình to (bloated), vi phạm SRP và Module Encapsulation, dễ gây merge conflict khi nhiều feature cùng sửa. | ❌ Loại bỏ |
| **Option 2: Modular Domain Error Objects (Được chọn)** | Tách biệt ranh giới module rõ ràng, tuân thủ Clean Architecture; module nào quản lý domain error của module đó; tái sử dụng interface `IAppError` và `AppException`. | Cần tạo thêm file constants trong từng module. | ✅ **Chọn (Khuyên dùng)** |
| **Option 3: Custom Domain Exception Classes per Module** | Tự tạo `DataProviderException`, `SimulationException` kế thừa `HttpException`. | Boilerplate code lớn, tạo ra quá nhiều class thừa trong khi `AppException` đã xử lý trọn vẹn `IAppError`. | ❌ Loại bỏ |

### Core Mechanism

```
                       [ Incoming HTTP Request ]
                                   │
                                   ▼
                    [ Controller / Service / Runner ]
                                   │
                    (Có lỗi nghiệp vụ / Validate phát sinh)
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
[ Common Error ]                                   [ Domain Module Error ]
src/constant/error-code.ts           src/modules/<domain>/constants/<domain>-error.ts
(AppError.BadRequest, RecordNotFound...)  (DataProviderError.FeatureAlreadyExists(type, id)...)
         │                                                   │
         └─────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
                  throw new AppException(appError)
                                   │
                                   ▼
                   [ AllExceptionsFilter (Global Filter) ]
                                   │
                         (Format Response Body)
                                   │
                                   ▼
                    {
                      "data": null,
                      "isSuccess": false,
                      "errors": [
                        {
                          "code": "feature_already_exists",
                          "message": "Tính năng 'search' đã tồn tại cho data provider.",
                          "params": { "type": "search", "dataProviderId": "123" }
                        }
                      ]
                    }
```

### Pattern Definition per Module

Mỗi module sẽ có một file error constants đại diện, ví dụ `src/modules/data-provider/constants/data-provider-error.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class DataProviderError {
    static readonly DataProviderNotFound: IAppError = {
        code: 'data_provider_not_found',
        message: 'Không tìm thấy nhà cung cấp dữ liệu.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static FeatureAlreadyExists = (type: string, dataProviderId: string): IAppError => ({
        code: 'feature_already_exists',
        message: `Tính năng '${type}' đã tồn tại cho data provider.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { type, dataProviderId },
    });
}
```

Và tại service [data-provider-feature.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts):
```typescript
// Trước:
// throw new BadRequestException(`Feature ${request.type} already exists for data provider ${dataProviderId}`);

// Sau:
throw new AppException(DataProviderError.FeatureAlreadyExists(request.type, dataProviderId));
```

---

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

1. **Client Breakage do đổi format error code**:
   - *Rủi ro*: Nếu Frontend đang regex/so khớp chuỗi `message` cũ để hiển thị thông báo, việc đổi message hoặc error code có thể làm lệch hành vi hiển thị.
   - *Giải pháp*: Giữ nguyên tính nhất quán của cấu trúc `{ isSuccess: false, errors: [{ code, message, params }] }`, đảm bảo frontend ưu tiên đọc `code` hoặc fallback về `message`.
2. **Lỗi chưa bắt trong background worker / async process**:
   - *Rủi ro*: Các worker/runner chạy ngoài HTTP request context có thể bị unhandled rejection nếu không bắt `AppException`.
   - *Giải pháp*: Đảm bảo `all-exception.filter.ts` và các runner catch-block xử lý tương thích cả `AppException` lẫn standard `Error`.
3. **HTTP Status Code Mapping**:
   - *Rủi ro*: Gán nhầm `HttpStatus.BAD_REQUEST` (400) cho các lỗi tài nguyên không tồn tại thay vì `HttpStatus.NOT_FOUND` (404) hoặc `HttpStatus.CONFLICT` (409).
   - *Giải pháp*: Chuẩn hóa rõ ràng statusCode trong từng definition của `IAppError`.
