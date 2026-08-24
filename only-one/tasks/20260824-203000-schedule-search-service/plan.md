---
status: done
slug: schedule-search-service
started_at: 2026-08-24
completed_at: 2026-08-24
pr_url: ~
branch: main
---

# Implementation Plan: Automated Search Discovery via Schedule & Worker Architecture

## Section 1. Current State

### 1.1 Verified Current Behavior & Execution Flow
- **Scraping Schedule Workflow**:
  - [`ScheduleService`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/schedule.service.ts): Triggers cron expressions, manages locks via [`RedisLockService`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/redis-lock.service.ts), and creates schedule jobs through [`ScheduleJobService.create()`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/schedule-job.service.ts#L28).
  - [`ScheduleJobService`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/schedule-job.service.ts): Looks up execution strategy from [`SCHEDULE_EXECUTION_SERVICE_MAP`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/constants/schedule-execution-service-map.ts) using `result.executionService`.
  - [`DataProviderScheduleService`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/schedule-execution/data-provider-schedule.service.ts#L42): Fetches data providers with [`DataProviderFeatureType.SCRAPING`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/enums/data-provider-feature-type.enum.ts#L2) in `READY` status, generates [`ProcessScrapeDataRequestDto`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/scraping-data-request.dto.ts), creates `ScheduleJobEventEntity` records, and enqueues jobs to [`QUEUE_NAME.SCRAPING_JOB`](file:///d:/Sources/Personal/only-one-be/src/modules/queue/enums/queue-name.enum.ts#L2).
  - [`ScrapingWorkerProcessor`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/scraping-worker.processor.ts#L33): Consumes `QUEUE_NAME.SCRAPING_JOB` and delegates processing to [`ScrapingDataService.processScrapeData()`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/scraping-data.service.ts).
- **Search Pipeline**:
  - [`DraftItemService.processSearchData()`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/draft-item.service.ts#L41): Executes batch search discovery and staging into `draft_items`, but can currently only be called via synchronous HTTP POST endpoint [`DraftItemController.processSearchData()`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/draft-item.controller.ts#L23).

### 1.2 Core Limitations Addressed
1. **No Automated / Scheduled Search Execution**: Operators cannot schedule recurring search discovery runs (e.g. daily/weekly crons to harvest newly discovered items from providers).
2. **Missing Search Queue & Worker Integration**: Bull queue and worker nodes have no handler for `processSearchData` jobs.

### 1.3 Behaviors That Must Remain Unchanged
- Existing scraping schedules ([`DataProviderScheduleService`](file:///d:/Sources/Personal/only-one-be/src/modules/schedule/services/schedule-execution/data-provider-schedule.service.ts)), `QUEUE_NAME.SCRAPING_JOB`, and [`ScrapingWorkerProcessor`](file:///d:/Sources/Personal/only-one-be/src/modules/worker/processors/scraping-worker.processor.ts) workflows must remain 100% untouched and functional.
- [`DraftItemService.processSearchData()`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/draft-item.service.ts#L41) core discovery and matching logic remains unchanged.

---

## Section 2. Detailed Design

### 2.1 Architecture & Component Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                       Schedule Module                       │
│  [ Cron / Schedule Trigger ]                                │
│              │                                              │
│              ▼                                              │
│     ScheduleJobService                                      │
│              │                                              │
│              ├─► ExecutionServiceEnum.DATA_PROVIDER ──────┐ │
│              │   (DataProviderScheduleService)            │ │
│              │                                            │ │
│              └─► ExecutionServiceEnum.SEARCH [NEW]        │ │
│                  (SearchScheduleService)                  │ │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                        Queue Module                         │
│  [ Bull Queue: QUEUE_NAME.SEARCH_JOB ]                      │
│   ISearchJobQueueInterface:                                 │
│    - scheduleJobId                                          │
│    - scheduleJobEventId                                     │
│    - request: ProcessSearchDataRequestDto                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                        Worker Module                        │
│  SearchWorkerProcessor [NEW]                                │
│    1. Update ScheduleJobEventEntity -> PROCESSING           │
│    2. Call DraftItemService.processSearchData(request)      │
│    3. On Complete: Update ScheduleJobEventEntity -> DONE    │
│    4. On Error: Update ScheduleJobEventEntity -> FAILED     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Execution Mechanics (`SearchScheduleService`)
1. **Input**: `IAddJobRequest` containing `scheduleJobId`, `scheduleType`, and `jobPayload`.
2. **Target Discovery**:
   - Case `ScheduleType.GLOBAL`: Query `DataProviderEntity` records that have features with `type = SEARCH` and `status = READY`.
   - Case `ScheduleType.DATA_PROVIDER`: Query specified `dataProviderIds` with `type = SEARCH` and `status = READY`.
3. **Payload Generation**:
   - Construct `ProcessSearchDataRequestDto` with `dataProviderIds: [dataProvider.id]` and optional `searchQueries` or `barcodes` from `jobPayload`.
4. **Queue Enqueue**:
   - Create `ScheduleJobEventEntity` records with status `PENDING`.
   - Call `QueueService.addBulkJob(QUEUE_NAME.SEARCH_JOB, jobs)`.

### 2.3 Adversarial Red-Team Checks (`doubt-driven-development`)
- `CLAIM`: Long-running search requests from multiple providers might block scraping jobs.
  - `DOUBT`: Queue congestion if both scraping and search share the same Bull queue.
  - `RECONCILE`: Dedicated queue `QUEUE_NAME.SEARCH_JOB = 'search-job'` provides total isolation between scraping and search job workloads.
- `CLAIM`: Worker nodes running without `WORKER_NODE_ENABLED` should gracefully avoid registering search processors.
  - `DOUBT`: Processor instantiation errors in API-only containers.
  - `RECONCILE`: Registered inside `WorkerModule.register()` guarded by `appConfigService.getBoolean('WORKER_NODE_ENABLED')`.

---

## Section 3. Implementation Architecture

### 3.1 Target Directory Tree

```
src/modules/
├── queue/
│   ├── enums/
│   │   ├── [MODIFY] queue-name.enum.ts
│   │   └── ...
│   ├── interfaces/
│   │   ├── [NEW] search-job-queue.interface.ts
│   │   └── [MODIFY] index.ts
│   ├── services/
│   │   └── [MODIFY] queue.service.ts
│   └── [MODIFY] queue.module.ts
├── schedule/
│   ├── enums/
│   │   ├── [MODIFY] schedule-execution.enum.ts
│   │   └── ...
│   ├── services/
│   │   ├── schedule-execution/
│   │   │   ├── [NEW] search-schedule.service.ts
│   │   │   └── ...
│   │   └── ...
│   └── [MODIFY] schedule.module.ts
└── worker/
    ├── constants/
    │   └── [MODIFY] message.ts
    ├── processors/
    │   ├── [NEW] search-worker.processor.ts
    │   └── ...
    └── [MODIFY] worker.module.ts
```

### 3.2 Planned File Changes Summary

| Action | Path | Responsibility |
| :--- | :--- | :--- |
| `[MODIFY]` | `src/modules/queue/enums/queue-name.enum.ts` | Add `SEARCH_JOB = 'search-job'` enum value. |
| `[NEW]` | `src/modules/queue/interfaces/search-job-queue.interface.ts` | Interface for search Bull job payload (`scheduleJobId`, `scheduleJobEventId`, `request`). |
| `[MODIFY]` | `src/modules/queue/interfaces/index.ts` | Export `ISearchJobQueueInterface`. |
| `[MODIFY]` | `src/modules/queue/services/queue.service.ts` | Inject and register `SEARCH_JOB` Bull queue. |
| `[MODIFY]` | `src/modules/queue/queue.module.ts` | Register `BullModule.registerQueue({ name: QUEUE_NAME.SEARCH_JOB })`. |
| `[MODIFY]` | `src/modules/schedule/enums/schedule-execution.enum.ts` | Add `SEARCH = 'search'` to `ExecutionServiceEnum`. |
| `[NEW]` | `src/modules/schedule/services/schedule-execution/search-schedule.service.ts` | Schedule execution service creating search job requests and enqueuing to `search-job` queue. |
| `[MODIFY]` | `src/modules/schedule/schedule.module.ts` | Register `SearchScheduleService` in `SCHEDULE_EXECUTION_SERVICE_MAP`. |
| `[MODIFY]` | `src/modules/worker/constants/message.ts` | Add worker message constants for search processor. |
| `[NEW]` | `src/modules/worker/processors/search-worker.processor.ts` | Bull queue processor consuming `search-job` and calling `DraftItemService.processSearchData()`. |
| `[MODIFY]` | `src/modules/worker/worker.module.ts` | Register `SearchWorkerProcessor` into worker processor list. |

---

## Section 4. Implementation Code Examples

### 4.1 `[MODIFY] src/modules/queue/enums/queue-name.enum.ts`
- **Responsibility**: Add `SEARCH_JOB` queue identifier.

```typescript
export enum QUEUE_NAME {
    SCRAPING_JOB = 'scraping-job',
    SEARCH_JOB = 'search-job',
}
```

---

### 4.2 `[NEW] src/modules/queue/interfaces/search-job-queue.interface.ts`
- **Responsibility**: Queue payload contract for search jobs.

```typescript
import { ProcessSearchDataRequestDto } from '../../data-provider/dtos/requests';

export interface ISearchJobQueueInterface {
    scheduleJobId: string;
    scheduleJobEventId: string;
    request: ProcessSearchDataRequestDto;
}
```

---

### 4.3 `[MODIFY] src/modules/queue/interfaces/index.ts`
- **Responsibility**: Export `search-job-queue.interface`.

```typescript
export * from './scraping-job-queue.interface';
export * from './search-job-queue.interface';
```

---

### 4.4 `[MODIFY] src/modules/queue/queue.module.ts`
- **Responsibility**: Register Bull queue for `SEARCH_JOB`.

```typescript
@Global()
@Module({
    imports: [
        forwardRef(() => SharedModule),
        BullModule.registerQueue(
            { name: QUEUE_NAME.SCRAPING_JOB },
            { name: QUEUE_NAME.SEARCH_JOB },
        ),
    ],
    controllers: [QueueController],
    providers: [QueueService],
    exports: [QueueService],
})
export class QueueModule {}
```

---

### 4.5 `[MODIFY] src/modules/queue/services/queue.service.ts`
- **Responsibility**: Inject `SEARCH_JOB` queue in `QueueService`.

```typescript
constructor(
    @InjectQueue(QUEUE_NAME.SCRAPING_JOB) private readonly scrapingJobQueue: Queue<IScrapingJobQueueInterface>,
    @InjectQueue(QUEUE_NAME.SEARCH_JOB) private readonly searchJobQueue: Queue<ISearchJobQueueInterface>,
) {
    this.registerQueue(QUEUE_NAME.SCRAPING_JOB, this.scrapingJobQueue);
    this.registerQueue(QUEUE_NAME.SEARCH_JOB, this.searchJobQueue);
}
```

---

### 4.6 `[MODIFY] src/modules/schedule/enums/schedule-execution.enum.ts`
- **Responsibility**: Add `SEARCH` execution service enum.

```typescript
export enum ExecutionServiceEnum {
    DATA_PROVIDER = 'data_provider',
    SEARCH = 'search',
}
```

---

### 4.7 `[NEW] src/modules/schedule/services/schedule-execution/search-schedule.service.ts`
- **Responsibility**: Strategy implementation of `IScheduleExecutionInterface` for search discovery.
- **Design pattern**: Strategy Pattern (`IScheduleExecutionInterface`).

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';

import { LoggerService } from '../../../../shared/services/logger.service';
import { ProcessSearchDataRequestDto } from '../../../data-provider/dtos/requests';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../../../data-provider/enums';
import { DataProviderService } from '../../../data-provider/services/data-provider.service';
import { QUEUE_NAME } from '../../../queue/enums/queue-name.enum';
import { ISearchJobQueueInterface } from '../../../queue/interfaces';
import { QueueService } from '../../../queue/services/queue.service';
import { PayloadScheduleDto } from '../../dtos/requests';
import { ScheduleJobEventEntity } from '../../entities/schedule-job-event.entity';
import { ScheduleJobEventType, ScheduleType } from '../../enums';
import { IAddJobRequest, IScheduleExecutionInterface } from '../../interfaces';
import { ScheduleJobEventService } from '../schedule-job-event.service';

@Injectable()
export class SearchScheduleService implements IScheduleExecutionInterface {
    private readonly loggerService: LoggerService = new LoggerService(SearchScheduleService.name);

    constructor(
        private readonly queueService: QueueService,
        private readonly dataProviderService: DataProviderService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
    ) {}

    async addJob(request: IAddJobRequest): Promise<boolean> {
        const { scheduleJobId, scheduleType, jobPayload } = request;

        const jobs = await this.getJobData(scheduleJobId, scheduleType, jobPayload);

        const queues = await this.queueService.addBulkJob(QUEUE_NAME.SEARCH_JOB, jobs);
        if (!queues.length) {
            this.loggerService.error(`[SearchScheduleService] Error adding search job to queue: ${scheduleJobId}`);
            throw new BadRequestException('Error adding search job to queue');
        }

        return true;
    }

    private async getJobData(
        scheduleJobId: string,
        scheduleType: ScheduleType,
        jobPayload?: PayloadScheduleDto,
    ): Promise<{ data: ISearchJobQueueInterface; opts?: any }[]> {
        const requests: ProcessSearchDataRequestDto[] = [];

        switch (scheduleType) {
            case ScheduleType.GLOBAL: {
                const dataProviders = await this.dataProviderService.repository
                    .createQueryBuilder('dataProvider')
                    .innerJoin('dataProvider.features', 'feature', 'feature.type = :type AND feature.status = :status', {
                        type: DataProviderFeatureType.SEARCH,
                        status: DataProviderFeatureStatus.READY,
                    })
                    .getMany();

                if (!dataProviders.length) {
                    this.loggerService.error(`[SearchScheduleService] No data providers available with active SEARCH feature`);
                    throw new NotFoundException('No data providers available with active SEARCH feature');
                }

                for (const dataProvider of dataProviders) {
                    requests.push(
                        new ProcessSearchDataRequestDto({
                            dataProviderIds: [dataProvider.id],
                            searchQueries: jobPayload?.searchQueries || [],
                            barcodes: jobPayload?.barcodes || [],
                        }),
                    );
                }
                break;
            }

            case ScheduleType.DATA_PROVIDER: {
                if (!jobPayload?.dataProviderIds?.length) {
                    this.loggerService.error(`[SearchScheduleService] No data provider IDs specified in jobPayload`);
                    throw new NotFoundException('No data providers specified for search schedule');
                }

                requests.push(
                    new ProcessSearchDataRequestDto({
                        dataProviderIds: jobPayload.dataProviderIds,
                        searchQueries: jobPayload.searchQueries || [],
                        barcodes: jobPayload.barcodes || [],
                    }),
                );
                break;
            }

            default: {
                this.loggerService.error(`[SearchScheduleService] Invalid schedule type for search: ${scheduleType}`);
                throw new BadRequestException('Invalid schedule type for search');
            }
        }

        const scheduleJobEventEntities: ScheduleJobEventEntity[] = [];
        const jobs = requests.map((request) => {
            const scheduleJobEventId = uuidv4();
            const scheduleJobEventEntity = this.scheduleJobEventService.repository.create({
                scheduleJobId,
                payload: request,
                id: scheduleJobEventId,
                eventMessage: 'Search discovery worker created',
                eventType: ScheduleJobEventType.PENDING,
            });
            scheduleJobEventEntities.push(scheduleJobEventEntity);

            return {
                data: {
                    request,
                    scheduleJobId,
                    scheduleJobEventId,
                },
                opts: {
                    removeOnFail: false,
                    removeOnComplete: true,
                },
            };
        });

        await this.scheduleJobEventService.repository.save(scheduleJobEventEntities);
        return jobs;
    }
}
```

---

### 4.8 `[MODIFY] src/modules/schedule/schedule.module.ts`
- **Responsibility**: Register `SearchScheduleService` into `SCHEDULE_EXECUTION_SERVICE_MAP`.

```typescript
const executionServices = [DataProviderScheduleService, SearchScheduleService];

// In providers:
{
    provide: SCHEDULE_EXECUTION_SERVICE_MAP,
    useFactory: (
        dataProviderScheduleService: DataProviderScheduleService,
        searchScheduleService: SearchScheduleService,
    ): Record<string, IScheduleExecutionInterface> => ({
        [ExecutionServiceEnum.DATA_PROVIDER]: dataProviderScheduleService,
        [ExecutionServiceEnum.SEARCH]: searchScheduleService,
    }),
    inject: [DataProviderScheduleService, SearchScheduleService],
}
```

---

### 4.9 `[MODIFY] src/modules/worker/constants/message.ts`
- **Responsibility**: Add worker message strings for search worker.

```typescript
export const SEARCH_WORKER_MESSAGE = {
    FAILED_TO_PROCESS_SEARCH_DATA: 'Failed to process search data',
};
```

---

### 4.10 `[NEW] src/modules/worker/processors/search-worker.processor.ts`
- **Responsibility**: Bull processor for `QUEUE_NAME.SEARCH_JOB` executing `DraftItemService.processSearchData()`.
- **Design pattern**: Consumer / Worker Processor Pattern.

```typescript
import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { CustomError } from '../../../exceptions/custom-error.exception';
import { LoggerService } from '../../../shared/services/logger.service';
import { ProcessSearchDataResponse } from '../../data-provider/dtos/responses';
import { DraftItemService } from '../../data-provider/services/draft-item.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { ISearchJobQueueInterface } from '../../queue/interfaces';
import { ScheduleJobEventType } from '../../schedule/enums';
import { ScheduleJobEventService } from '../../schedule/services/schedule-job-event.service';
import { SEARCH_WORKER_MESSAGE } from '../constants/message';

export type SearchWorkerProcessorType = Job<ISearchJobQueueInterface>;

@Processor(QUEUE_NAME.SEARCH_JOB)
@Injectable()
export class SearchWorkerProcessor {
    private readonly workerProcessName: string;
    private readonly loggerService: LoggerService = new LoggerService(SearchWorkerProcessor.name);

    constructor(
        private readonly draftItemService: DraftItemService,
        private readonly scheduleJobEventService: ScheduleJobEventService,
    ) {
        this.workerProcessName = (global as any).WORKER_PROCESS_NAME || 'UnknownWorker';
        this.loggerService.log('SearchWorkerProcessor Initialized');
    }

    @Process()
    async process(job: SearchWorkerProcessorType): Promise<ProcessSearchDataResponse> {
        this.loggerService.log(`Starting search job ${job.id}, attempts: ${job.attemptsMade}`);

        if (!job.attemptsMade) {
            await this.updateScheduleJobEvent(job, ScheduleJobEventType.PROCESSING);
        }

        try {
            const data = job.data.request;
            const searchData = await this.draftItemService.processSearchData(data);

            if (!searchData) {
                throw new CustomError(SEARCH_WORKER_MESSAGE.FAILED_TO_PROCESS_SEARCH_DATA);
            }

            return searchData;
        } catch (error) {
            throw new CustomError(error?.message, error?.data);
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: SearchWorkerProcessorType, searchData: ProcessSearchDataResponse): Promise<void> {
        this.loggerService.log(`Search job ${job.data.scheduleJobEventId} completed. Created drafts: ${searchData?.totalDraftsCreated}`);
        await this.updateScheduleJobEvent(job, ScheduleJobEventType.COMPLETED, searchData);
    }

    @OnQueueFailed()
    async onFailed(job: SearchWorkerProcessorType, error: Error): Promise<void> {
        this.loggerService.error(`Search job ${job.data.scheduleJobEventId} failed. Error: ${error.message}`);
        await this.updateScheduleJobEvent(job, ScheduleJobEventType.FAILED, null, error?.message);
    }

    private async updateScheduleJobEvent(
        job: SearchWorkerProcessorType,
        eventType: ScheduleJobEventType,
        result?: ProcessSearchDataResponse,
        errorMessage?: string,
    ): Promise<void> {
        const { scheduleJobEventId } = job.data;
        const event = await this.scheduleJobEventService.findById(scheduleJobEventId);
        if (!event) return;

        event.eventType = eventType;
        if (result) {
            event.eventMessage = `Completed: ${result.totalDraftsCreated} drafts created, ${result.success} success, ${result.error} errors`;
        }
        if (errorMessage) {
            event.errorMessage = errorMessage;
        }
        if (eventType === ScheduleJobEventType.COMPLETED || eventType === ScheduleJobEventType.FAILED) {
            event.finishAt = new Date();
        }
        if (eventType === ScheduleJobEventType.PROCESSING) {
            event.startAt = new Date();
        }

        await this.scheduleJobEventService.repository.save(event);
    }
}
```

---

### 4.11 `[MODIFY] src/modules/worker/worker.module.ts`
- **Responsibility**: Add `SearchWorkerProcessor` to `processors` array.

```typescript
const processors = [ScrapingWorkerProcessor, SearchWorkerProcessor];
```

---

## Section 5. Test Cases

### 5.1 Unit Tests (`src/modules/schedule/_tests/search-schedule.service.spec.ts`)

#### TC-01: Global Search Schedule Job Creation
- **Objective**: Verify `SearchScheduleService.addJob` finds search-ready providers, persists `ScheduleJobEventEntity` in `PENDING` state, and pushes jobs to Bull Queue.
- **Precondition**: `DataProviderEntity` with `type = SEARCH` and `status = READY` exists.
- **Action**: Call `searchScheduleService.addJob({ scheduleJobId: 'job-1', scheduleType: ScheduleType.GLOBAL, jobPayload: {} })`.
- **Expected Result**: Returns `true`. `queueService.addBulkJob` called with `QUEUE_NAME.SEARCH_JOB`. `ScheduleJobEventEntity` saved in `PENDING` status.

#### TC-02: No Active Search Data Providers Error Handling
- **Objective**: Verify `SearchScheduleService.addJob` throws `NotFoundException` when no provider has `SEARCH` in `READY` status.
- **Precondition**: No `DataProviderEntity` matches search criteria.
- **Action**: Call `searchScheduleService.addJob({ scheduleJobId: 'job-2', scheduleType: ScheduleType.GLOBAL, jobPayload: {} })`.
- **Expected Result**: Throws `NotFoundException('No data providers available with active SEARCH feature')`.

### 5.2 Unit Tests (`src/modules/worker/_tests/search-worker.processor.spec.ts`)

#### TC-03: Search Worker Processor Execution & Event Lifecycle
- **Objective**: Verify `SearchWorkerProcessor.process` calls `DraftItemService.processSearchData()` and triggers event completion update.
- **Precondition**: Mock `Job` with `ISearchJobQueueInterface` payload and mock `DraftItemService`.
- **Action**: Call `searchWorkerProcessor.process(mockJob)`.
- **Expected Result**: `DraftItemService.processSearchData` called with job payload request. Returns `ProcessSearchDataResponse`.

### 5.3 Verification Commands
- Build Check: `npm run build`
- Linting: `npm run lint`
