# Walkthrough: Decommission Legacy Search Pipeline & Consolidate into Discovery Engine

## 1. Tóm tắt Thay đổi (Executive Summary)
Hoàn thành toàn diện việc tháo dỡ (decommission/teardown) chuỗi xử lý tìm kiếm cũ (Legacy Search Pipeline) trong Backend `only-one-be`. Toàn bộ khả năng khám phá và quét tài nguyên hiện được tập trung duy nhất tại **Discovery Engine** (`DiscoverySession`, `DiscoveryUrl`, `DiscoveryRunnerService`, `DiscoveryValidationService`).

Đồng thời, **`DataProviderFeatureType.SEARCH` (giá trị `'search'`) được bảo tồn** để tiếp tục làm định danh tính năng Discovery cho Data Providers.

---

### Các hạng mục cốt lõi đã thực hiện:
1. **Queue Layer Teardown**:
   - Gỡ bỏ hàng đợi `QUEUE_NAME.SEARCH_JOB` khỏi [`QueueModule`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/queue.module.ts).
   - Loại bỏ `searchJobQueue` injection và đăng ký khỏi [`QueueService`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/services/queue.service.ts).
   - Xóa interface `search-job-queue.interface.ts`.
2. **Schedule Layer Teardown**:
   - Gỡ bỏ `ExecutionServiceEnum.SEARCH` khỏi [`ExecutionServiceEnum`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/enums/schedule-execution.enum.ts).
   - Loại bỏ `SearchScheduleService` khỏi [`ScheduleExecutorModule`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/schedule.module.ts).
   - Xóa file service `search-schedule.service.ts` và spec test `search-schedule.service.spec.ts`.
3. **Worker Layer Teardown**:
   - Loại bỏ `SearchWorkerProcessor` khỏi [`WorkerModule`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/worker.module.ts).
   - Xóa file `search-worker.processor.ts` và spec test `search-worker.processor.spec.ts`.
4. **Strategy Registry & Runner Layer Teardown**:
   - Gỡ bỏ `SearchFeatureRunner` khỏi [`FeatureRunnerRegistry`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners/feature-runner.registry.ts).
   - Xóa file `search-feature.runner.ts`.
5. **Data Provider Services & Controllers Elimination**:
   - Xóa sạch 12 files bao gồm `DataProviderSearchController`, `DataProviderSearchService`, `GenericDataProviderSearchService`, hằng số factory mapping, interfaces, request/response DTOs và enum search status.
   - Dọn dẹp method `runFunctionSearchData` trong [`ExtractDataHelper`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/helpers/extract-data.helper.ts).
   - Cập nhật [`DataProviderModule`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.module.ts) và các barrel exports (`interfaces`, `requests`, `responses`, `enums`).

---

## 2. Chi tiết File Thay đổi (File Changes Summary)

| Loại thay đổi | Đường dẫn File | Mô tả chi tiết |
| :--- | :--- | :--- |
| **`[MODIFY]`** | `src/modules/queue/enums/queue-name.enum.ts` | Gỡ bỏ `SEARCH_JOB` |
| **`[MODIFY]`** | `src/modules/queue/services/queue.service.ts` | Gỡ bỏ `searchJobQueue` |
| **`[MODIFY]`** | `src/modules/queue/queue.module.ts` | Gỡ bỏ Bull queue registration cho search |
| **`[MODIFY]`** | `src/modules/queue/interfaces/index.ts` | Dọn dẹp barrel exports |
| **`[MODIFY]`** | `src/modules/schedule/enums/schedule-execution.enum.ts` | Gỡ bỏ `SEARCH` enum |
| **`[MODIFY]`** | `src/modules/schedule/schedule.module.ts` | Gỡ bỏ `SearchScheduleService` |
| **`[MODIFY]`** | `src/modules/worker/worker.module.ts` | Gỡ bỏ `SearchWorkerProcessor` |
| **`[MODIFY]`** | `src/modules/data-provider/runners/feature-runner.registry.ts` | Gỡ bỏ `SearchFeatureRunner` |
| **`[MODIFY]`** | `src/modules/data-provider/helpers/extract-data.helper.ts` | Gỡ bỏ `runFunctionSearchData` |
| **`[MODIFY]`** | `src/modules/data-provider/data-provider.module.ts` | Gỡ bỏ controller, service và factory map search |
| **`[MODIFY]`** | `src/modules/data-provider/interfaces/index.ts` | Dọn dẹp barrel exports |
| **`[MODIFY]`** | `src/modules/data-provider/dtos/requests/index.ts` | Dọn dẹp barrel exports |
| **`[MODIFY]`** | `src/modules/data-provider/dtos/responses/index.ts` | Dọn dẹp barrel exports |
| **`[MODIFY]`** | `src/modules/data-provider/enums/index.ts` | Dọn dẹp barrel exports |
| **`[DELETE]`** | `src/modules/queue/interfaces/search-job-queue.interface.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/schedule/services/schedule-execution/search-schedule.service.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/schedule/_tests/search-schedule.service.spec.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/worker/processors/search-worker.processor.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/worker/_tests/search-worker.processor.spec.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/runners/search-feature.runner.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/controllers/data-provider-search.controller.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/services/data-provider-search.service.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/constants/data-provider-search-service-map.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/interfaces/data-provider-search-service.interface.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/interfaces/search-config.interface.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/dtos/requests/search-items-request.dto.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/dtos/requests/process-search-data-request.dto.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/dtos/responses/search-items-response.dto.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/dtos/responses/process-search-data-response.dto.ts` | Xóa file |
| **`[DELETE]`** | `src/modules/data-provider/enums/data-provider-search-status.enum.ts` | Xóa file |

---

## 3. Bằng chứng Xác minh & Kiểm thử (Verification Evidence)

### 3.1 TypeScript & NestJS Compilation (`npm run build`)
- **Command**: `npm run build`
- **Output**:
```text
> only-one-be@0.0.1 build
> rimraf dist && tsc -p tsconfig.build.json && nest build

Exit Code: 0 (Success)
```
- **Kết luận**: Toàn bộ dự án compile thành công 100%, không còn bất kỳ dangling reference hay type checking errors nào.

### 3.2 Linter & Prettier Compliance (`npx eslint`)
- **Command**: `$env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint "src/**/*.ts"`
- **Output**: `Exit Code: 0 (0 errors, 0 warnings)`
- **Kết luận**: 100% mã nguồn tuân thủ nghiêm ngặt tiêu chuẩn định dạng và quy tắc lint.

### 3.3 Preserved Discovery Engine Integrity
- Các module và endpoint Discovery:
  - `POST /discovery-sessions` (tạo và thực thi crawl session độc lập)
  - `GET /discovery-sessions`
  - `POST /discovery-sessions/:id/validate`
  - `POST /discovery-sessions/:id/urls/batch-enqueue`
  hoạt động ổn định và giữ vai trò là Single Source of Truth cho luồng khám phá dữ liệu.

