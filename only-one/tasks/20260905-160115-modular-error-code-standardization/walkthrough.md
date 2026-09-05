# Walkthrough: Chuẩn Hóa Modular Error Code & Exception Handling (only-one-be)

Đã hoàn tất quá trình tái cấu trúc và chuẩn hóa toàn bộ cơ chế ném lỗi (error throwing) trong codebase `only-one-be` sang kiến trúc **Modular Domain Error Code**.

---

## 1. Tóm tắt các thay đổi đã thực hiện (Summary of Changes)

### 1.1 Thư viện Error Constants dùng chung & Domain Modules
- **Common / System Errors**:
  - Mở rộng [src/constant/error-code.ts](file:///d:/Sources/Personal/only-one-be/src/constant/error-code.ts) bổ sung `FileNotFound`, `InvalidJsonFile`.
- **Domain Modular Errors (10 Modules)**:
  - [auth-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/auth/constants/auth-error.ts) (`AuthError`): Các mã lỗi xác thực, tài khoản vô hiệu hóa, token hết hạn.
  - [user-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/user/constants/user-error.ts) (`UserError`): Lỗi không tìm thấy user, trùng lặp email, sai mật khẩu hiện tại.
  - [data-provider-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/constants/data-provider-error.ts) (`DataProviderError`): Lỗi tính năng đã tồn tại, provider không tìm thấy, URL discovery, session...
  - [simulation-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/simulation/constants/simulation-error.ts) (`SimulationError`): Lỗi browser execution, element timeout, input not found, context failed...
  - [schedule-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/constants/schedule-error.ts) (`ScheduleError`): Lỗi cron syntax, duplicate schedule, queue job failure...
  - [setting-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/setting/constants/setting-error.ts) (`SettingError`): Lỗi setting key already exists, setting not found.
  - [queue-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/queue/constants/queue-error.ts) (`QueueError`): Lỗi queue not found.
  - [cloud-data-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/cloud-data/constants/cloud-data-error.ts) (`CloudDataError`): Lỗi cloud provider, upload failed, session invalid...
  - [google-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/google/constants/google-error.ts) (`GoogleError`): Lỗi Google auth, file drive, file tag...
  - [import-data-error.ts](file:///d:/Sources/Personal/only-one-be/src/modules/import-data/constants/import-data-error.ts) (`ImportDataError`): Lỗi định dạng import data.

### 1.2 Refactor Services / Helpers / Pipes sang `AppException`
Đã thay thế toàn bộ `throw new BadRequestException(...)`, `throw new NotFoundException(...)`, `throw new ConflictException(...)`, `throw new UnauthorizedException(...)`, `throw new Error(...)` bằng `throw new AppException(<DomainError>)` tại các services:
- `auth.service.ts`
- `user.service.ts`
- `data-provider-feature.service.ts`
- `data-provider.service.ts`
- `discovery-session.service.ts`
- `discovery-url.service.ts`
- `item.service.ts`
- `feature-runner.registry.ts`
- `simulation-item.service.ts`
- `simulation-execution.service.ts`
- `browser.helper.ts`
- `schedule.service.ts`
- `schedule-job.service.ts`
- `data-provider-schedule.service.ts`
- `setting.service.ts`
- `queue.service.ts`
- `cloud-data-item.service.ts`
- `google-drive.service.ts`
- `file-tag.service.ts`
- `import-data.service.ts`
- `local-file.service.ts`
- `validate-date.pipe.ts`

---

## 2. Kết quả Xác thực (Verification Results)

### 2.1 TypeScript Compilation (`npm run build`)
```bash
> only-one-be@0.0.1 build
> rimraf dist && tsc -p tsconfig.build.json && nest build
```
- **Kết quả**: ✅ **Passed (Exit code 0)** - Toàn bộ mã nguồn biên dịch thành công mà không có bất kỳ lỗi type check nào.

### 2.2 Linter & Code Formatting (`npm run lint`)
```bash
> only-one-be@0.0.1 lint
> eslint "{src,test}/**/*.ts"
```
- **Kết quả**: ✅ **Passed (Exit code 0)** - Tuân thủ 100% quy chuẩn ESLint và import sorting.

---

## 3. Client Error Response Example

Tất cả các lỗi ném ra từ backend hiện tại sẽ được [all-exception.filter.ts](file:///d:/Sources/Personal/only-one-be/src/filters/all-exception.filter.ts) chuẩn hóa đồng nhất:

```json
{
  "data": null,
  "isSuccess": false,
  "errors": [
    {
      "code": "data_provider_feature_already_exists",
      "message": "Tính năng 'scraping' đã tồn tại cho nhà cung cấp dữ liệu.",
      "params": {
        "type": "scraping",
        "dataProviderId": "098d57d5-d0cb-4bb9-ae20-d33a6b8c9d46"
      }
    }
  ]
}
```
