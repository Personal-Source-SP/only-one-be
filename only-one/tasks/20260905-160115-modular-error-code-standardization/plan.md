---
status: done
slug: modular-error-code-standardization
started_at: 2026-09-05
completed_at: 2026-09-05
pr_url: ~
branch: ~
---

# Plan: Chuẩn Hóa Modular Error Code & Exception Handling (only-one-be)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- **Hiện trạng ném lỗi (Error Throwing Inconsistency)**:
  - Hiện tại, các service/controller/helper trong `only-one-be` đang ném lỗi bằng nhiều cách rời rạc: `throw new BadRequestException('string')`, `throw new NotFoundException(...)`, `throw new ConflictException(...)`, `throw new UnauthorizedException(...)` hoặc `throw new Error(...)`.
  - Hầu hết error message là chuỗi text cứng (hardcoded), không có mã định danh lỗi ổn định (`error code`), gây khó khăn cho Frontend khi cần mapping xử lý logic theo code hoặc triển khai localization / i18n.
- **Hạ tầng Exception Handling sẵn có**:
  - Đã có `IAppError` & `AppError` tại [error-code.ts](file:///d:/Sources/Personal/only-one-be/src/constant/error-code.ts).
  - Đã có [app.exception.ts](file:///d:/Sources/Personal/only-one-be/src/exceptions/app.exception.ts) (`AppException`) kế thừa `HttpException`.
  - Đã có [all-exception.filter.ts](file:///d:/Sources/Personal/only-one-be/src/filters/all-exception.filter.ts) tự động chuẩn hóa cấu trúc HTTP Response về định dạng:
    ```json
    {
      "data": null,
      "isSuccess": false,
      "errors": [{ "code": "error_code_slug", "message": "Thông điệp lỗi", "params": {} }]
    }
    ```
- **Invariants bắt buộc bảo toàn**:
  - **HTTP Response Format**: Giữ nguyên schema `ResponseDto<null>` và mảng `errors: ErrorResponse[]` của `AllExceptionsFilter`.
  - **Module Encapsulation**: Mỗi module quản lý các lỗi nghiệp vụ riêng trong thư mục `src/modules/<module-name>/constants/`, không dồn toàn bộ vào file trung tâm để tránh monolithic bloat và merge conflicts.
  - **Common Errors**: `src/constant/error-code.ts` giữ vai trò single source of truth cho các lỗi hệ thống chung (system, auth, validation, database, filesystem).

---

## Section 2. Detailed Design (Thiết kế Kỹ thuật Chi tiết)

### 2.1 Kiến trúc Modular Error Constants
Tổ chức các hằng số lỗi theo domain boundary, mỗi file xuất khẩu một class tĩnh chứa các hằng số `IAppError` hoặc factory function sinh `IAppError`:

```
src/
├── constant/
│   └── error-code.ts                      <-- Common / System Errors (AppError)
└── modules/
    ├── auth/constants/auth-error.ts       <-- Auth Errors (AuthError)
    ├── user/constants/user-error.ts       <-- User Errors (UserError)
    ├── data-provider/constants/
    │   └── data-provider-error.ts         <-- Data Provider & Runner Errors (DataProviderError)
    ├── simulation/constants/
    │   └── simulation-error.ts            <-- Simulation & Browser Errors (SimulationError)
    ├── schedule/constants/
    │   └── schedule-error.ts              <-- Schedule & Job Errors (ScheduleError)
    ├── setting/constants/
    │   └── setting-error.ts               <-- Setting Errors (SettingError)
    ├── queue/constants/
    │   └── queue-error.ts                 <-- Queue Errors (QueueError)
    ├── cloud-data/constants/
    │   └── cloud-data-error.ts            <-- Cloud Data Errors (CloudDataError)
    ├── google/constants/
    │   └── google-error.ts                <-- Google Drive & Tag Errors (GoogleError)
    └── import-data/constants/
        └── import-data-error.ts           <-- Import Data Errors (ImportDataError)
```

### 2.2 Quy ước chuẩn hóa `IAppError` & Factory Functions
Mỗi lỗi nghiệp vụ có tham số động (dynamic params) bắt buộc trả về object có thuộc tính `params`:
```typescript
export class DataProviderError {
    static FeatureAlreadyExists = (type: string, dataProviderId: string): IAppError => ({
        code: 'data_provider_feature_already_exists',
        message: `Tính năng '${type}' đã tồn tại cho data provider.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { type, dataProviderId },
    });
}
```

### 2.3 Quy chuẩn Exception Throwing trong Services & Controllers
- Thay thế toàn bộ:
  ```typescript
  // CŨ (Antipattern):
  throw new BadRequestException(`Feature ${request.type} already exists for data provider ${dataProviderId}`);
  // MỚI (Chuẩn hóa):
  throw new AppException(DataProviderError.FeatureAlreadyExists(request.type, dataProviderId));
  ```

---

## Section 3. Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Reused Existing Utilities / Helpers | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/constant/error-code.ts` | `AppError` | `HttpStatus` | `None` | `npm run build` |
| **2** | `[x]` | `[NEW]` | `src/modules/auth/constants/auth-error.ts` | `AuthError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **3** | `[x]` | `[NEW]` | `src/modules/user/constants/user-error.ts` | `UserError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **4** | `[x]` | `[NEW]` | `src/modules/data-provider/constants/data-provider-error.ts` | `DataProviderError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **5** | `[x]` | `[NEW]` | `src/modules/simulation/constants/simulation-error.ts` | `SimulationError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **6** | `[x]` | `[NEW]` | `src/modules/schedule/constants/schedule-error.ts` | `ScheduleError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **7** | `[x]` | `[NEW]` | `src/modules/setting/constants/setting-error.ts` | `SettingError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **8** | `[x]` | `[NEW]` | `src/modules/queue/constants/queue-error.ts` | `QueueError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **9** | `[x]` | `[NEW]` | `src/modules/cloud-data/constants/cloud-data-error.ts` | `CloudDataError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **10** | `[x]` | `[NEW]` | `src/modules/google/constants/google-error.ts` | `GoogleError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **11** | `[x]` | `[NEW]` | `src/modules/import-data/constants/import-data-error.ts` | `ImportDataError` | `IAppError`, `HttpStatus` | `Order 1` | `npm run build` |
| **12** | `[x]` | `[MODIFY]` | `src/modules/auth/services/auth.service.ts` | `AuthService.login`, `refreshToken` | `AppException`, `AuthError` | `Order 2` | `npm run build` |
| **13** | `[x]` | `[MODIFY]` | `src/modules/user/services/user.service.ts` | `UserService.getUserLogin`, `create`, `update`, `changePassword` | `AppException`, `UserError` | `Order 3` | `npm run build` |
| **14** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-feature.service.ts` | `DataProviderFeatureService.createFeature`, `updateFeatureConfig`, `switchStatus`, `testFeature`, `getFeatureByProviderIdAndType` | `AppException`, `DataProviderError` | `Order 4` | `npm run build` |
| **15** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider.service.ts` | `DataProviderService` methods | `AppException`, `DataProviderError` | `Order 4` | `npm run build` |
| **16** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-session.service.ts` | `DiscoverySessionService` methods | `AppException`, `DataProviderError` | `Order 4` | `npm run build` |
| **17** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-url.service.ts` | `DiscoveryUrlService` methods | `AppException`, `DataProviderError` | `Order 4` | `npm run build` |
| **18** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/item.service.ts` | `ItemService` methods | `AppException`, `DataProviderError` | `Order 4` | `npm run build` |
| **19** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/feature-runner.registry.ts` | `FeatureRunnerRegistry.getRunner` | `AppException`, `DataProviderError` | `Order 4` | `npm run build` |
| **20** | `[x]` | `[MODIFY]` | `src/modules/simulation/services/simulation-item.service.ts` | `SimulationItemService` methods | `AppException`, `SimulationError` | `Order 5` | `npm run build` |
| **21** | `[x]` | `[MODIFY]` | `src/modules/simulation/services/simulation-execution.service.ts` | `SimulationExecutionService` methods | `AppException`, `SimulationError` | `Order 5` | `npm run build` |
| **22** | `[x]` | `[MODIFY]` | `src/modules/simulation/helpers/browser.helper.ts` | `BrowserHelper` methods | `AppException`, `SimulationError` | `Order 5` | `npm run build` |
| **23** | `[x]` | `[MODIFY]` | `src/modules/schedule/services/schedule.service.ts` | `ScheduleService` methods | `AppException`, `ScheduleError` | `Order 6` | `npm run build` |
| **24** | `[x]` | `[MODIFY]` | `src/modules/schedule/services/schedule-job.service.ts` | `ScheduleJobService` methods | `AppException`, `ScheduleError` | `Order 6` | `npm run build` |
| **25** | `[x]` | `[MODIFY]` | `src/modules/schedule/services/schedule-execution/data-provider-schedule.service.ts` | `DataProviderScheduleService` methods | `AppException`, `ScheduleError` | `Order 6` | `npm run build` |
| **26** | `[x]` | `[MODIFY]` | `src/modules/setting/services/setting.service.ts` | `SettingService` methods | `AppException`, `SettingError` | `Order 7` | `npm run build` |
| **27** | `[x]` | `[MODIFY]` | `src/modules/queue/services/queue.service.ts` | `QueueService` methods | `AppException`, `QueueError` | `Order 8` | `npm run build` |
| **28** | `[x]` | `[MODIFY]` | `src/modules/cloud-data/services/cloud-data-item.service.ts` | `CloudDataItemService` methods | `AppException`, `CloudDataError` | `Order 9` | `npm run build` |
| **29** | `[x]` | `[MODIFY]` | `src/modules/cloud-data/services/cloud-data-provider.service.ts` | `CloudDataProviderService` methods | `AppException`, `CloudDataError` | `Order 9` | `npm run build` |
| **30** | `[x]` | `[MODIFY]` | `src/modules/google/services/google-drive.service.ts` | `GoogleDriveService` methods | `AppException`, `GoogleError` | `Order 10` | `npm run build` |
| **31** | `[x]` | `[MODIFY]` | `src/modules/google/services/file-tag.service.ts` | `FileTagService` methods | `AppException`, `GoogleError` | `Order 10` | `npm run build` |
| **32** | `[x]` | `[MODIFY]` | `src/modules/import-data/services/import-data.service.ts` | `ImportDataService` methods | `AppException`, `ImportDataError` | `Order 11` | `npm run build` |
| **33** | `[x]` | `[MODIFY]` | `src/shared/services/local-file.service.ts` | `LocalFileService` methods | `AppException`, `AppError` | `Order 1` | `npm run build` |
| **34** | `[x]` | `[MODIFY]` | `src/common/pipes/validate-date.pipe.ts` | `ValidateDatePipe` | `AppException`, `AppError` | `Order 1` | `npm run build` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/constant/error-code.ts`
> **Action**: Bổ sung các error helper dùng chung cho hệ thống file, cấu hình và validate.

```diff
@@ line 90 @@
     static InvalidFieldFormat = (field: string, reason?: string): IAppError => ({
         code: 'invalid_field_format',
         message: reason ? `Trường '${field}' không hợp lệ: ${reason}` : `Trường '${field}' không đúng định dạng.`,
         statusCode: HttpStatus.BAD_REQUEST,
         params: { field, reason },
     });
+
+    // ! 5. FILE & IO ERRORS
+    static FileNotFound = (path: string): IAppError => ({
+        code: 'file_not_found',
+        message: `Không tìm thấy file: ${path}`,
+        statusCode: HttpStatus.NOT_FOUND,
+        params: { path },
+    });
+
+    static InvalidJsonFile = (reason?: string): IAppError => ({
+        code: 'invalid_json_file',
+        message: reason ? `File JSON không hợp lệ: ${reason}` : 'File JSON không hợp lệ.',
+        statusCode: HttpStatus.BAD_REQUEST,
+        params: { reason },
+    });
 }
```

---

### 2. `[NEW]` `src/modules/auth/constants/auth-error.ts`
> **Action**: Tạo domain error constants cho Auth module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class AuthError {
    static readonly InvalidCredentials: IAppError = {
        code: 'auth_invalid_credentials',
        message: 'Email hoặc mật khẩu không chính xác.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly UserInactive: IAppError = {
        code: 'auth_user_inactive',
        message: 'Tài khoản người dùng đã bị vô hiệu hóa.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly InvalidPassword: IAppError = {
        code: 'auth_invalid_password',
        message: 'Mật khẩu không chính xác.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly InvalidRefreshToken: IAppError = {
        code: 'auth_invalid_refresh_token',
        message: 'Refresh token không hợp lệ hoặc đã hết hạn.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly UserNotFound: IAppError = {
        code: 'auth_user_not_found',
        message: 'Không tìm thấy thông tin tài khoản người dùng.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };
}
```

---

### 3. `[NEW]` `src/modules/user/constants/user-error.ts`
> **Action**: Tạo domain error constants cho User module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class UserError {
    static readonly UserNotFound: IAppError = {
        code: 'user_not_found',
        message: 'Không tìm thấy người dùng trong hệ thống.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly EmailAlreadyExists: IAppError = {
        code: 'user_email_already_exists',
        message: 'Email đã tồn tại trong hệ thống.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly EmailAlreadyInUse: IAppError = {
        code: 'user_email_already_in_use',
        message: 'Email đã được sử dụng bởi tài khoản khác.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly InvalidCurrentPassword: IAppError = {
        code: 'user_invalid_current_password',
        message: 'Mật khẩu hiện tại không chính xác.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };
}
```

---

### 4. `[NEW]` `src/modules/data-provider/constants/data-provider-error.ts`
> **Action**: Tạo domain error constants cho Data Provider module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class DataProviderError {
    static readonly DataProviderNotFound: IAppError = {
        code: 'data_provider_not_found',
        message: 'Không tìm thấy nhà cung cấp dữ liệu.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly DuplicateDataProvider: IAppError = {
        code: 'data_provider_already_exists',
        message: 'Nhà cung cấp dữ liệu đã tồn tại.',
        statusCode: HttpStatus.CONFLICT,
    };

    static FeatureNotFound = (id: string): IAppError => ({
        code: 'data_provider_feature_not_found',
        message: `Không tìm thấy tính năng với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static FeatureAlreadyExists = (type: string, dataProviderId: string): IAppError => ({
        code: 'data_provider_feature_already_exists',
        message: `Tính năng '${type}' đã tồn tại cho nhà cung cấp dữ liệu.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { type, dataProviderId },
    });

    static FeatureTypeNotFound = (type: string, dataProviderId: string): IAppError => ({
        code: 'data_provider_feature_type_not_found',
        message: `Không tìm thấy tính năng '${type}' cho nhà cung cấp dữ liệu.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { type, dataProviderId },
    });

    static readonly InvalidStatusSwitchUnconfigured: IAppError = {
        code: 'data_provider_invalid_switch_unconfigured',
        message: 'Không được phép chuyển trạng thái về UNCONFIGURED.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly InvalidStatusSwitchReady: IAppError = {
        code: 'data_provider_invalid_switch_ready',
        message: 'Chỉ được phép chuyển sang trạng thái READY khi đang ở trạng thái TESTING hoặc ERROR.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly InvalidStatusSwitchTesting: IAppError = {
        code: 'data_provider_invalid_switch_testing',
        message: 'Không được phép chuyển sang trạng thái TESTING từ trạng thái hiện tại.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static RunnerNotFound = (type: string): IAppError => ({
        code: 'data_provider_runner_not_found',
        message: `Không tìm thấy runner cho tính năng '${type}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { type },
    });

    static SessionNotFound = (id: string): IAppError => ({
        code: 'discovery_session_not_found',
        message: `Không tìm thấy phiên discovery với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static UrlNotFound = (id: string): IAppError => ({
        code: 'discovery_url_not_found',
        message: `Không tìm thấy URL discovery với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static ItemNotFound = (id: string): IAppError => ({
        code: 'data_provider_item_not_found',
        message: `Không tìm thấy item dữ liệu với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });
}
```

---

### 5. `[NEW]` `src/modules/simulation/constants/simulation-error.ts`
> **Action**: Tạo domain error constants cho Simulation module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class SimulationError {
    static readonly ItemNotFound: IAppError = {
        code: 'simulation_item_not_found',
        message: 'Không tìm thấy simulation item.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly ServiceExecutionRequired: IAppError = {
        code: 'simulation_service_execution_required',
        message: 'Service execution là bắt buộc.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static ServiceExecutionNotSupported = (service: string): IAppError => ({
        code: 'simulation_service_execution_not_supported',
        message: `Service execution '${service}' không được hỗ trợ.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { service },
    });

    static UnsupportedActionType = (actionType: string): IAppError => ({
        code: 'simulation_unsupported_action_type',
        message: `Action type '${actionType}' không được hỗ trợ.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { actionType },
    });

    static readonly GetCurrentPageFailed: IAppError = {
        code: 'simulation_get_current_page_failed',
        message: 'Không thể lấy trang hiện tại từ browser context.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static readonly CloseBrowserFailed: IAppError = {
        code: 'simulation_close_browser_failed',
        message: 'Không thể đóng browser context.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static ElementTimeout = (selector: string, timeoutInMs: number): IAppError => ({
        code: 'simulation_browser_element_timeout',
        message: `Phần tử '${selector}' không xuất hiện sau ${timeoutInMs}ms.`,
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        params: { selector, timeoutInMs },
    });

    static InputNotFound = (selector: string): IAppError => ({
        code: 'simulation_browser_input_not_found',
        message: `Không tìm thấy ô nhập liệu '${selector}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { selector },
    });

    static readonly OptionParamRequired: IAppError = {
        code: 'simulation_browser_option_param_required',
        message: 'Bắt buộc phải truyền optionValue hoặc optionLabel.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static OptionValueNotFound = (value: string, selector: string): IAppError => ({
        code: 'simulation_browser_option_value_not_found',
        message: `Giá trị option '${value}' không tồn tại cho selector '${selector}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { value, selector },
    });

    static OptionLabelNotFound = (label: string, selector: string): IAppError => ({
        code: 'simulation_browser_option_label_not_found',
        message: `Nhãn option '${label}' không tồn tại cho selector '${selector}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { label, selector },
    });
}
```

---

### 6. `[NEW]` `src/modules/schedule/constants/schedule-error.ts`
> **Action**: Tạo domain error constants cho Schedule module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class ScheduleError {
    static readonly InvalidCronExpression: IAppError = {
        code: 'schedule_invalid_cron_expression',
        message: 'Biểu thức cron không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly DuplicateSchedule: IAppError = {
        code: 'schedule_duplicate',
        message: 'Lịch trình đã tồn tại trong hệ thống.',
        statusCode: HttpStatus.CONFLICT,
    };

    static ScheduleNotFound = (id: string): IAppError => ({
        code: 'schedule_not_found',
        message: `Không tìm thấy lịch trình với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static readonly StatusSwitchFailed: IAppError = {
        code: 'schedule_status_switch_failed',
        message: 'Lỗi khi chuyển đổi trạng thái lịch trình.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly TriggerScheduleFailed: IAppError = {
        code: 'schedule_trigger_failed',
        message: 'Lỗi khi kích hoạt thực thi lịch trình.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly InvalidExecutionService: IAppError = {
        code: 'schedule_invalid_execution_service',
        message: 'Service thực thi lịch trình không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly JobQueueAddFailed: IAppError = {
        code: 'schedule_job_queue_add_failed',
        message: 'Không thể thêm job vào hàng đợi thực thi.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static readonly NoDataProvidersToScrape: IAppError = {
        code: 'schedule_no_data_providers_to_scrape',
        message: 'Không có nhà cung cấp dữ liệu nào sẵn sàng để scrape.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly NoItemsToScrape: IAppError = {
        code: 'schedule_no_items_to_scrape',
        message: 'Không có item nào sẵn sàng để scrape.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly InvalidScheduleType: IAppError = {
        code: 'schedule_invalid_type',
        message: 'Loại lịch trình không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };
}
```

---

### 7. `[NEW]` `src/modules/setting/constants/setting-error.ts`
> **Action**: Tạo domain error constants cho Setting module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class SettingError {
    static readonly KeyAlreadyExists: IAppError = {
        code: 'setting_key_already_exists',
        message: 'Khóa cấu hình đã tồn tại trong hệ thống.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly SettingNotFound: IAppError = {
        code: 'setting_not_found',
        message: 'Không tìm thấy cấu hình cài đặt.',
        statusCode: HttpStatus.NOT_FOUND,
    };
}
```

---

### 8. `[NEW]` `src/modules/queue/constants/queue-error.ts`
> **Action**: Tạo domain error constants cho Queue module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class QueueError {
    static QueueNotFound = (queueName: string): IAppError => ({
        code: 'queue_not_found',
        message: `Không tìm thấy hàng đợi: ${queueName}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { queueName },
    });
}
```

---

### 9. `[NEW]` `src/modules/cloud-data/constants/cloud-data-error.ts`
> **Action**: Tạo domain error constants cho Cloud Data module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class CloudDataError {
    static readonly ItemNotFound: IAppError = {
        code: 'cloud_data_item_not_found',
        message: 'Không tìm thấy bản ghi cloud data item.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly ProviderNotFound: IAppError = {
        code: 'cloud_data_provider_not_found',
        message: 'Không tìm thấy nhà cung cấp cloud data.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly TelegramSessionInvalid: IAppError = {
        code: 'cloud_data_telegram_session_invalid',
        message: 'Phiên kết nối Telegram không hợp lệ hoặc đã hết hạn.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };
}
```

---

### 10. `[NEW]` `src/modules/google/constants/google-error.ts`
> **Action**: Tạo domain error constants cho Google module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class GoogleError {
    static readonly AuthFailed: IAppError = {
        code: 'google_auth_failed',
        message: 'Xác thực tài khoản Google thất bại.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly DriveFileNotFound: IAppError = {
        code: 'google_drive_file_not_found',
        message: 'Không tìm thấy file trên Google Drive.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly FileTagNotFound: IAppError = {
        code: 'google_file_tag_not_found',
        message: 'Không tìm thấy thẻ phân loại file.',
        statusCode: HttpStatus.NOT_FOUND,
    };
}
```

---

### 11. `[NEW]` `src/modules/import-data/constants/import-data-error.ts`
> **Action**: Tạo domain error constants cho Import Data module.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class ImportDataError {
    static readonly InvalidImportFormat: IAppError = {
        code: 'import_data_invalid_format',
        message: 'Định dạng file hoặc cấu trúc dữ liệu import không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly ImportFailed: IAppError = {
        code: 'import_data_failed',
        message: 'Quá trình import dữ liệu thất bại.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
}
```

---

### 12. `[MODIFY]` `src/modules/data-provider/services/data-provider-feature.service.ts`
> **Action**: Thay thế `BadRequestException` và `NotFoundException` sang `AppException(DataProviderError.XYZ)`.

```diff
@@ line 3 @@
-import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
+import { forwardRef, Inject, Injectable } from '@nestjs/common';
+import { AppException } from '../../../exceptions/app.exception';
+import { DataProviderError } from '../constants/data-provider-error';
@@ line 38 @@
         const existing = await this.exists({ dataProviderId, type: request.type });
         if (existing) {
-            throw new BadRequestException(`Feature ${request.type} already exists for data provider ${dataProviderId}`);
+            throw new AppException(DataProviderError.FeatureAlreadyExists(request.type, dataProviderId));
         }
@@ line 56 @@
         const feature = await this.findById(id);
         if (!feature) {
-            throw new NotFoundException(`Feature with ID ${id} not found`);
+            throw new AppException(DataProviderError.FeatureNotFound(id));
         }
@@ line 136 @@
     async switchStatus(id: string, status: DataProviderFeatureStatus): Promise<boolean> {
         if (status === DataProviderFeatureStatus.UNCONFIGURED) {
-            throw new BadRequestException('Not allowed to switch status to UNCONFIGURED');
+            throw new AppException(DataProviderError.InvalidStatusSwitchUnconfigured);
         }

         const feature = await this.dataProviderFeatureRepository.findOne({
             where: { id },
             relations: { dataProvider: true },
         });

         if (!feature) {
-            throw new NotFoundException(`Feature with ID ${id} not found`);
+            throw new AppException(DataProviderError.FeatureNotFound(id));
         }

         if (status === DataProviderFeatureStatus.READY) {
             if (feature.status !== DataProviderFeatureStatus.TESTING && feature.status !== DataProviderFeatureStatus.ERROR) {
-                throw new BadRequestException('Not allowed to switch status to READY unless currently TESTING or ERROR');
+                throw new AppException(DataProviderError.InvalidStatusSwitchReady);
             }
@@ line 168 @@
             ) {
-                throw new BadRequestException('Not allowed to switch status to TESTING from current state');
+                throw new AppException(DataProviderError.InvalidStatusSwitchTesting);
             }
         }
@@ line 182 @@
         if (!feature) {
-            throw new NotFoundException(`Feature with ID ${id} not found`);
+            throw new AppException(DataProviderError.FeatureNotFound(id));
         }
@@ line 196 @@
         const feature = await this.findOneByFilter({ dataProviderId, type });
         if (!feature) {
-            throw new NotFoundException(`Feature ${type} not found for data provider ${dataProviderId}`);
+            throw new AppException(DataProviderError.FeatureTypeNotFound(type, dataProviderId));
         }
```

---

## Section 5. Test Cases & Verification

### Automated Tests & Quality Gates
- **TypeScript Compilation Verification**:
  ```bash
  npm run build
  ```
- **Linter & Code Format Check**:
  ```bash
  npm run lint
  ```

### Manual Verification Checklist
1. **Validation & Exception Filter Verification**:
   - Gọi API tạo feature trùng lặp: `POST /api/v1/data-providers/:id/features` với type đã tồn tại.
   - Kiểm tra Response Body có `isSuccess: false`, `code: "data_provider_feature_already_exists"`, `params: { type: "...", dataProviderId: "..." }`.
2. **Auth & User Exception Verification**:
   - Gọi API đăng nhập sai mật khẩu: `POST /api/v1/auth/sign-in`.
   - Kiểm tra Response Body trả về `code: "auth_invalid_credentials"` với HTTP Status 401.
