# Walkthrough: Automated Search Discovery via Schedule & Worker Architecture

## 1. Summary of Changes

Implemented automated scheduled execution for search discovery across data providers, integrating `ScheduleModule`, `QueueModule`, and `WorkerModule`:

### 1.1 Queue Module Updates
- [`QUEUE_NAME`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/enums/queue-name.enum.ts): Added `SEARCH_JOB = 'search-job'`.
- [`ISearchJobQueueInterface`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/interfaces/search-job-queue.interface.ts): Created queue payload contract containing `scheduleJobId`, `scheduleJobEventId`, and `ProcessSearchDataRequestDto`.
- Exported in [`src/modules/queue/interfaces/index.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/interfaces/index.ts).
- [`QueueModule`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/queue.module.ts): Registered Bull queue `QUEUE_NAME.SEARCH_JOB`.
- [`QueueService`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/services/queue.service.ts): Injected and registered `searchJobQueue`.

### 1.2 Schedule Module Updates
- [`ExecutionServiceEnum`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/enums/schedule-execution.enum.ts): Added `SEARCH = 'search'`.
- [`PayloadScheduleDto`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/dtos/requests/schedule-request.dto.ts): Extended with optional `searchQueries` and `barcodes`.
- [`SearchScheduleService`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/schedule-execution/search-schedule.service.ts): Implemented `IScheduleExecutionInterface` strategy for search discovery:
  - Queries `DataProviderEntity` with `type = SEARCH` and `status = READY`.
  - Creates `ScheduleJobEventEntity` in `PENDING` state.
  - Enqueues batch payloads to `QUEUE_NAME.SEARCH_JOB`.
- [`ScheduleExecutorModule`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/schedule.module.ts): Registered `SearchScheduleService` into `SCHEDULE_EXECUTION_SERVICE_MAP`.

### 1.3 Worker Module Updates
- [`SEARCH_WORKER_MESSAGE`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/constants/message.ts): Added message constants.
- [`SearchWorkerProcessor`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/search-worker.processor.ts): Created Bull queue processor for `QUEUE_NAME.SEARCH_JOB`:
  - Transitions `ScheduleJobEventEntity` to `PROCESSING`.
  - Executes `DraftItemService.processSearchData()`.
  - Updates `ScheduleJobEventEntity` with results (`COMPLETED` or `FAILED`).
- [`WorkerModule`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/worker.module.ts): Added `SearchWorkerProcessor` to processors list.

---

## 2. Verification Results

### Build Verification
- Executed `npm run build`:
```text
> only-one-be@0.0.1 build
> rimraf dist && tsc -p tsconfig.build.json && nest build
```
Result: **Build succeeded with 0 TypeScript/NestJS errors.**

### Unit Tests
- Created unit tests in:
  - [`src/modules/schedule/_tests/search-schedule.service.spec.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/_tests/search-schedule.service.spec.ts):
    - TC-01: Global Search Schedule Job Creation
    - TC-02: No Active Search Data Providers Error Handling
  - [`src/modules/worker/_tests/search-worker.processor.spec.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/_tests/search-worker.processor.spec.ts):
    - TC-03: Search Worker Processor Execution & Event Lifecycle
