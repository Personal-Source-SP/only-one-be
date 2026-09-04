---
status: done
slug: refactor-modules-with-custom-decorators
started_at: 2026-09-04
completed_at: 2026-09-04
pr_url: ~
branch: ~
---

# Plan: Toàn diện Áp dụng Bộ Decorators Chuẩn Hoá cho 100% Modules trong Only-One-BE

## Section 1. Current State (Hiện trạng & Phân tích Toàn bộ Mã nguồn)
- **Kiểm tra toàn bộ 15 modules trong `src/modules`**:
  - `auth`: `auth.request.dto.ts`, `auth.response.dto.ts`, `auth.controller.ts`
  - `user`: `create-user.request.dto.ts`, `update-user.request.dto.ts`, `change-password.request.dto.ts`, `user.dto.ts`, `user.controller.ts`
  - `setting`: `setting-request.dto.ts`, `setting.dto.ts`, `setting.controller.ts`
  - `audit-log`: `record-audit-log.dto.ts`, `audit-log.dto.ts`, `audit-log.controller.ts`
  - `data-provider`: 9 request DTOs, 10 entity/response DTOs, 9 controllers (`data-provider`, `data-provider-feature`, `data-provider-item`, `discovery-session`, `discovery-url`, `discovery-validation`, `scraping-data`, `item`)
  - `simulation`: `simulation-context.request.ts`, `simulation-item.request.ts`, `simulate-unlucid-ai.request.ts`, `simulation.controller.ts`, `simulation-context.controller.ts`, `simulation-item.controller.ts`
  - `schedule`: `schedule-request.dto.ts`, `schedule-job-request.dto.ts`, `schedule.controller.ts`, `schedule-job.controller.ts`, `schedule-job-event.controller.ts`
  - `google`: `google-drive.request.ts`, `google-drive-tag.request.ts`, `google-folder.request.ts`, `google-auth.request.ts`, `file-tag.request.ts`, `google-auth.controller.ts`, `google-drive.controller.ts`, `google-file.controller.ts`, `google-folder.controller.ts`, `file-tag.controller.ts`
  - `cloud-data`: `cloud-data-provider.controller.ts`, `cloud-data-item.controller.ts`, `cloud-data-provider-request.dto.ts`, `telegram-request.dto.ts`
  - `import-data`: `import-data-request.dto.ts`, `import-data.controller.ts`
  - `notification`: `notification-request.dto.ts`, `notification.dto.ts`
  - `queue`: `queue.controller.ts`
  - `websocket`, `bull-board`, `worker`: Gateway/Processor setup.

---

## Section 2. Detailed Design (Thiết kế Kỹ thuật Chi tiết)
- **DTOs Transformation Patterns**:
  - String inputs: `@StringField({ maxLength, minLength, toLowerCase })` (tự động tích hợp `@Trim()`).
  - Optional strings: `@StringFieldOptional({ maxLength, description })`.
  - Passwords: `@PasswordField()` (tự động validate minLength >= 6, charset regex, auto `@Trim()`).
  - Emails: `@EmailField()` / `@EmailFieldOptional()` (tự động lowercase, email format, auto `@Trim()`).
  - Phone numbers: `@PhoneField()` / `@PhoneFieldOptional()` (tự động format E.164, default country code 'VN', auto `@Trim()`).
  - UUIDs: `@UUIDField()` / `@UUIDFieldOptional()` (tự động validate UUID v4, swagger format uuid, auto `@Trim()`).
  - Enums: `@EnumField(() => EnumType)` / `@EnumFieldOptional(() => EnumType)` (tự động auto `@Trim()` & map swagger enum).
  - Objects / JSON: `@ObjectFieldOptional()`.
  - Booleans: `@BooleanField()` / `@BooleanFieldOptional()` (tự động cast string `'true'`/`'false'`/`1`/`0`).
  - Numbers: `@NumberField()` / `@NumberFieldOptional({ int: true, min, max })`.
  - Date inputs: `@DateField()` / `@DateFieldOptional()`.
- **Controllers Transformation Patterns**:
  - Bỏ cụm `@ApiBearerAuth()` + `@UseGuards(JwtAuthGuard)` $\rightarrow$ Gom thành `@Auth()`.
  - Bỏ `@Param('id', new ParseUUIDPipe())` $\rightarrow$ Gom thành `@UUIDParam('id')`.

---

## Section 3. Task Matrix & Dependency Graph (Toàn bộ 15 Modules)

| Order | Status | Action | Module | File Path | Symbols / Target Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `auth` | `src/modules/auth/dtos/requests/auth.request.dto.ts` | `SignUpRequestDto`, `SignInRequestDto`, `RefreshTokenRequestDto` | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `auth` | `src/modules/auth/controllers/auth.controller.ts` | `AuthController.refreshToken` | `Order 1` | `npm run build` |
| **3** | `[x]` | `[MODIFY]` | `user` | `src/modules/user/dtos/requests/create-user.request.dto.ts` | `CreateUserRequestDto` | `None` | `npm run build` |
| **4** | `[x]` | `[MODIFY]` | `user` | `src/modules/user/dtos/requests/update-user.request.dto.ts` | `UpdateUserRequestDto` | `None` | `npm run build` |
| **5** | `[x]` | `[MODIFY]` | `user` | `src/modules/user/dtos/requests/change-password.request.dto.ts` | `ChangePasswordRequestDto` | `None` | `npm run build` |
| **6** | `[x]` | `[MODIFY]` | `user` | `src/modules/user/controllers/user.controller.ts` | `UserController` | `Order 3, 4, 5` | `npm run build` |
| **7** | `[x]` | `[MODIFY]` | `setting` | `src/modules/setting/dtos/requests/setting-request.dto.ts` | `CreateSettingRequestDto`, `UpdateSettingRequestDto` | `None` | `npm run build` |
| **8** | `[x]` | `[MODIFY]` | `setting` | `src/modules/setting/controllers/setting.controller.ts` | `SettingController` | `Order 7` | `npm run build` |
| **9** | `[x]` | `[MODIFY]` | `audit-log` | `src/modules/audit-log/dtos/requests/record-audit-log.dto.ts` | `RecordAuditLogDto` | `None` | `npm run build` |
| **10** | `[x]` | `[MODIFY]` | `audit-log` | `src/modules/audit-log/controllers/audit-log.controller.ts` | `AuditLogController` | `Order 9` | `npm run build` |
| **11** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/data-provider-request.dto.ts` | `CreateDataProviderRequestDto`, `UpdateDataProviderRequestDto` | `None` | `npm run build` |
| **12** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts` | `CreateDataProviderFeatureRequestDto`, `UpdateDataProviderFeatureRequestDto` | `None` | `npm run build` |
| **13** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/data-provider-item-request.dto.ts` | `CreateDataProviderItemRequestDto`, `UpdateDataProviderItemRequestDto` | `None` | `npm run build` |
| **14** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/create-discovery-session-request.dto.ts` | `CreateDiscoverySessionRequestDto` | `None` | `npm run build` |
| **15** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/batch-enqueue-discovery-urls-request.dto.ts` | `BatchEnqueueDiscoveryUrlsRequestDto` | `None` | `npm run build` |
| **16** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/discovery-validation-request.dto.ts` | `DiscoveryValidationRequestDto` | `None` | `npm run build` |
| **17** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/scraping-data-request.dto.ts` | `ScrapingDataRequestDto` | `None` | `npm run build` |
| **18** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/dtos/requests/item-request.dto.ts` | `CreateItemRequestDto`, `UpdateItemRequestDto` | `None` | `npm run build` |
| **19** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/data-provider.controller.ts` | `DataProviderController` | `Order 11` | `npm run build` |
| **20** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/data-provider-feature.controller.ts` | `DataProviderFeatureController` | `Order 12` | `npm run build` |
| **21** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/data-provider-item.controller.ts` | `DataProviderItemController` | `Order 13` | `npm run build` |
| **22** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/discovery-session.controller.ts` | `DiscoverySessionController` | `Order 14` | `npm run build` |
| **23** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/discovery-url.controller.ts` | `DiscoveryUrlController` | `Order 15` | `npm run build` |
| **24** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/discovery-validation.controller.ts` | `DiscoveryValidationController` | `Order 16` | `npm run build` |
| **25** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/scraping-data.controller.ts` | `ScrapingDataController` | `Order 17` | `npm run build` |
| **26** | `[x]` | `[MODIFY]` | `data-provider` | `src/modules/data-provider/controllers/item.controller.ts` | `ItemController` | `Order 18` | `npm run build` |
| **27** | `[x]` | `[MODIFY]` | `schedule` | `src/modules/schedule/dtos/requests/schedule-request.dto.ts` | `CreateScheduleRequestDto`, `UpdateScheduleRequestDto` | `None` | `npm run build` |
| **28** | `[x]` | `[MODIFY]` | `schedule` | `src/modules/schedule/dtos/requests/schedule-job-request.dto.ts` | `ScheduleJobRequestDto` | `None` | `npm run build` |
| **29** | `[x]` | `[MODIFY]` | `schedule` | `src/modules/schedule/controllers/schedule.controller.ts` | `ScheduleController` | `Order 27` | `npm run build` |
| **30** | `[x]` | `[MODIFY]` | `schedule` | `src/modules/schedule/controllers/schedule-job.controller.ts` | `ScheduleJobController` | `Order 28` | `npm run build` |
| **31** | `[x]` | `[MODIFY]` | `schedule` | `src/modules/schedule/controllers/schedule-job-event.controller.ts` | `ScheduleJobEventController` | `None` | `npm run build` |
| **32** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/dtos/requests/google-drive.request.ts` | `GoogleDrivePreviewRequest`, `GoogleDriveSyncRequest` | `None` | `npm run build` |
| **33** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/dtos/requests/google-drive-tag.request.ts` | `GoogleDriveTagRequest` | `None` | `npm run build` |
| **34** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/dtos/requests/google-folder.request.ts` | `GoogleFolderRequest` | `None` | `npm run build` |
| **35** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/dtos/requests/google-auth.request.ts` | `UpdateGoogleAuthRequestDto` | `None` | `npm run build` |
| **36** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/dtos/requests/file-tag.request.ts` | `CreateFileTagRequestDto`, `AssignTagsToFileByIdsRequestDto`, etc. | `None` | `npm run build` |
| **37** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/controllers/google-drive.controller.ts` | `GoogleDriveController` | `Order 32` | `npm run build` |
| **38** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/controllers/google-file.controller.ts` | `GoogleFileController` | `None` | `npm run build` |
| **39** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/controllers/google-folder.controller.ts` | `GoogleFolderController` | `Order 34` | `npm run build` |
| **40** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/controllers/google-auth.controller.ts` | `GoogleAuthController` | `Order 35` | `npm run build` |
| **41** | `[x]` | `[MODIFY]` | `google` | `src/modules/google/controllers/file-tag.controller.ts` | `FileTagController` | `Order 36` | `npm run build` |
| **42** | `[x]` | `[MODIFY]` | `simulation` | `src/modules/simulation/dtos/requests/simulation-context.request.ts` | `SimulationContextRequest` | `None` | `npm run build` |
| **43** | `[x]` | `[MODIFY]` | `simulation` | `src/modules/simulation/dtos/requests/simulation-item.request.ts` | `SimulationItemRequest` | `None` | `npm run build` |
| **44** | `[x]` | `[MODIFY]` | `simulation` | `src/modules/simulation/dtos/requests/simulate-unlucid-ai.request.ts` | `SimulateUnlucidAiRequest` | `None` | `npm run build` |
| **45** | `[x]` | `[MODIFY]` | `simulation` | `src/modules/simulation/controllers/simulation.controller.ts` | `SimulationController` | `Order 42, 43, 44` | `npm run build` |
| **46** | `[x]` | `[MODIFY]` | `simulation` | `src/modules/simulation/controllers/simulation-context.controller.ts` | `SimulationContextController` | `Order 42` | `npm run build` |
| **47** | `[x]` | `[MODIFY]` | `simulation` | `src/modules/simulation/controllers/simulation-item.controller.ts` | `SimulationItemController` | `Order 43` | `npm run build` |
| **48** | `[x]` | `[MODIFY]` | `cloud-data` | `src/modules/cloud-data/dtos/requests/cloud-data-provider-request.dto.ts` | `CreateCloudDataProviderRequest`, `UpdateCloudDataProviderRequest`, `CloudDataUploadFileRequest` | `None` | `npm run build` |
| **49** | `[x]` | `[MODIFY]` | `cloud-data` | `src/modules/cloud-data/dtos/requests/telegram-request.dto.ts` | `TelegramUploadDocumentRequest` | `None` | `npm run build` |
| **50** | `[x]` | `[MODIFY]` | `cloud-data` | `src/modules/cloud-data/controllers/cloud-data-provider.controller.ts` | `CloudDataProviderController` | `Order 48` | `npm run build` |
| **51** | `[x]` | `[MODIFY]` | `cloud-data` | `src/modules/cloud-data/controllers/cloud-data-item.controller.ts` | `CloudDataItemController` | `Order 48` | `npm run build` |
| **52** | `[x]` | `[MODIFY]` | `import-data` | `src/modules/import-data/dtos/requests/import-data-request.dto.ts` | `ImportDataRequestDto` | `None` | `npm run build` |
| **53** | `[x]` | `[MODIFY]` | `import-data` | `src/modules/import-data/controllers/import-data.controller.ts` | `ImportDataController` | `Order 52` | `npm run build` |
| **54** | `[x]` | `[MODIFY]` | `notification` | `src/modules/notification/dtos/requests/notification-request.dto.ts` | `CreateNotificationRequest` | `None` | `npm run build` |
| **55** | `[x]` | `[MODIFY]` | `queue` | `src/modules/queue/controllers/queue.controller.ts` | `QueueController` | `None` | `npm run build` |

---

## Section 4. Verification Plan

- **Automated Tests**:
  - `npm run build` (Xác thực 100% các modules, DTOs và controllers compile thành công, không thiếu decorator import nào).
  - `ESLINT_USE_FLAT_CONFIG=false npx eslint "src/**/*.ts"` (Xác thực tuân thủ linter và prettier).
- **Manual Checks**:
  - Swagger UI: kiểm tra tất cả 27 controllers và toàn bộ request schemas.
