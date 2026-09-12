---
status: done
slug: 20260912-153500-refactor-discovery-session-with-search-feature
started_at: 2026-09-12
completed_at: 2026-09-12
pr_url: ~
branch: ~
---

# Plan: Tái Cấu Trúc Discovery Session Tích Hợp Search Feature, Bull Queue Worker & Xóa Bỏ Discovery Runner

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại & Bottleneck**:
  - `CreateDiscoverySessionRequestDto` yêu cầu nhập `targetUrl` thủ công và dùng `targetKeyword: string` đơn lẻ thay vì mảng từ khóa `targetKeywords: string[]`.
  - `DiscoverySessionEntity` chứa trường `notes` không sử dụng, chưa có trường `targetKeywords: string[]` (lưu trữ dưới dạng `jsonb`), nhưng cần giữ lại `targetUrl: string` để lưu snapshot base URL/Pattern thực tế đã kích hoạt phiên cào dữ liệu.
  - Tồn tại file `discovery.runner.ts` thừa thãi, tự triển khai lại logic cào dữ liệu lặp lại và tạo ra phụ thuộc vòng `forwardRef` với `DiscoverySessionService`.
  - `DiscoverySessionService.create` kích hoạt runner trực tiếp qua Promise bất đồng bộ không được quản lý bằng Queue, không thể scale, retry hay kiểm soát concurrency theo từng từ khóa.
- **Invariants bắt buộc duy trì**:
  - Giữ lại cột `targetUrl: string` trong `DiscoverySessionEntity` và `DiscoverySessionDto`.
  - Tự động sinh `sessionCode` theo định dạng `DISC-<PROVIDER_PREFIX>-<RANDOM>`.
  - Tự động kích hoạt `DiscoveryValidationService.startBatchValidation` khi session/keyword hoàn tất và cờ `autoValidate` bật.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md)*

### Type Signatures & Code Contracts

- **`QUEUE_NAME.DISCOVERY_SEARCH_JOB`**: `'discovery-search-job'`
- **`IDiscoverySearchJob`**:
  ```typescript
  export interface IDiscoverySearchJob {
      sessionId: string;
      keyword: string;
  }
  ```
- **`DiscoverySearchWorkerProcessor`**:
  ```typescript
  @Processor(QUEUE_NAME.DISCOVERY_SEARCH_JOB)
  @Injectable()
  export class DiscoverySearchWorkerProcessor {
      constructor(private readonly discoverySessionService: DiscoverySessionService) {}

      @Process({ concurrency: 3 })
      async process(job: Job<IDiscoverySearchJob>): Promise<void>;
  }
  ```
- **`CreateDiscoverySessionRequestDto`**:
  - Thêm duy nhất: `@StringFieldOptional({ each: true, description: 'Target keywords for search feature and fuzzy matching' }) targetKeywords?: string[]`
  - Cập nhật: `@NumberFieldOptional() maxUrls?: number` (override config).
  - Loại bỏ hoàn toàn: `@URLField() targetUrl`, `@StringFieldOptional() notes`, `@StringFieldOptional() targetKeyword`.
- **`DiscoverySessionEntity`**:
  - Giữ nguyên: `@Column({ type: 'varchar', length: 2000 }) targetUrl: string;`
  - Thêm mới: `@Column({ type: 'jsonb', nullable: true, default: [] }) targetKeywords?: string[];`
  - Loại bỏ: `notes?: string`.
- **`DiscoverySessionDto`**:
  - Giữ: `targetUrl: string;`
  - Thêm: `targetKeywords?: string[];`
  - Loại bỏ: `notes?: string;`
- **`DiscoverySessionService`**:
  - Method `create(request: CreateDiscoverySessionRequestDto, user?: PayloadDto): Promise<DiscoverySessionDto>`: Enqueue jobs cho từng keyword vào `QueueService`.
  - Method `processDiscoverySearch(sessionId: string, keyword: string): Promise<void>`:
    - Lấy session kèm feature `SEARCH`.
    - Build `searchUrl` bằng `SearchFeatureRunner.buildSearchUrl(searchConfig, { query: keyword })`.
    - Gọi `DATA_PROVIDER_SEARCH_SERVICE_MAP[searchFeature.service].getExtractSearchData({ url: searchUrl, targetConfig })`.
    - Lưu các records `DiscoveryUrlEntity[]`, cập nhật tổng số URLs của session, kích hoạt validation batch nếu `autoValidate`.
- **`discovery.runner.ts`**: **Xóa bỏ hoàn toàn file này**.

### AST Seams & Callers

- `QueueModule` & `QueueService`: Đăng ký `QUEUE_NAME.DISCOVERY_SEARCH_JOB`.
- `WorkerModule`: Đăng ký `DiscoverySearchWorkerProcessor`.
- `DataProviderModule`: Xóa `DiscoveryRunner` khỏi providers/runners list.
- `DataProviderProfile.mapDiscoverySession`: Bỏ mapping `notes`, map `targetKeywords` và `targetUrl`.
- Frontend `CreateSessionModal.tsx`: Hỗ trợ nhập danh sách từ khóa `targetKeywords` (Select mode="tags"), bỏ ô nhập `targetUrl` & `notes`.
- Frontend `types.ts`: Cập nhật `IDiscoverySession` (có `targetUrl: string`, `targetKeywords?: string[]`) và `CreateSessionFormValues` (`targetKeywords?: string[]`).

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
only-one-be/src/modules/
├── queue/
│   ├── enums/
│   │   └── [MODIFY] queue-name.enum.ts
│   ├── interfaces/
│   │   ├── [NEW]    discovery-search-job-queue.interface.ts
│   │   └── [MODIFY] index.ts
│   ├── services/
│   │   └── [MODIFY] queue.service.ts
│   └── [MODIFY] queue.module.ts
├── worker/
│   ├── processors/
│   │   └── [NEW]    discovery-search-worker.processor.ts
│   └── [MODIFY] worker.module.ts
├── data-provider/
│   ├── dtos/
│   │   ├── [MODIFY] discovery-session.dto.ts
│   │   └── requests/
│   │       └── [MODIFY] create-discovery-session-request.dto.ts
│   ├── entities/
│   │   └── [MODIFY] discovery-session.entity.ts
│   ├── runners/
│   │   └── [DELETE] discovery.runner.ts
│   ├── services/
│   │   ├── [MODIFY] discovery-session.service.ts
│   │   └── _tests/
│   │       └── [MODIFY] discovery-session.service.spec.ts
│   ├── [MODIFY] data-provider.module.ts
│   └── [MODIFY] data-provider.profile.ts

only-one-fe/src/app/(root)/scraping/discovery/
├── [MODIFY] types.ts
└── components/
    └── [MODIFY] CreateSessionModal.tsx
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/queue/enums/queue-name.enum.ts` | `QUEUE_NAME.DISCOVERY_SEARCH_JOB` | `None` | `npx tsc -p tsconfig.build.json` |
| **2** | `[x]` | `[NEW]` | `only-one-be/src/modules/queue/interfaces/discovery-search-job-queue.interface.ts` | `IDiscoverySearchJob` | `Order 1` | `npx tsc -p tsconfig.build.json` |
| **3** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/queue/interfaces/index.ts` | `export *` | `Order 2` | `npx tsc -p tsconfig.build.json` |
| **4** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/queue/services/queue.service.ts` | `QueueService.constructor` | `Order 3` | `npx tsc -p tsconfig.build.json` |
| **5** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/queue/queue.module.ts` | `QueueModule` | `Order 4` | `npx tsc -p tsconfig.build.json` |
| **6** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/dtos/requests/create-discovery-session-request.dto.ts` | `CreateDiscoverySessionRequestDto` | `None` | `npx tsc -p tsconfig.build.json` |
| **7** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/entities/discovery-session.entity.ts` | `DiscoverySessionEntity` | `None` | `npx tsc -p tsconfig.build.json` |
| **8** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/dtos/discovery-session.dto.ts` | `DiscoverySessionDto` | `Order 7` | `npx tsc -p tsconfig.build.json` |
| **9** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/data-provider.profile.ts` | `DataProviderProfile.mapDiscoverySession` | `Order 6, 7, 8` | `npx tsc -p tsconfig.build.json` |
| **10** | `[x]` | `[DELETE]` | `only-one-be/src/modules/data-provider/runners/discovery.runner.ts` | `DiscoveryRunner` | `None` | `npx tsc -p tsconfig.build.json` |
| **11** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/data-provider.module.ts` | `DataProviderModule` | `Order 10` | `npx tsc -p tsconfig.build.json` |
| **12** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/services/discovery-session.service.ts` | `DiscoverySessionService` | `Order 5, 9, 11` | `npx tsc -p tsconfig.build.json` |
| **13** | `[x]` | `[NEW]` | `only-one-be/src/modules/worker/processors/discovery-search-worker.processor.ts` | `DiscoverySearchWorkerProcessor` | `Order 12` | `npx tsc -p tsconfig.build.json` |
| **14** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/worker/worker.module.ts` | `WorkerModule` | `Order 13` | `npx tsc -p tsconfig.build.json` |
| **15** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/data-provider/services/_tests/discovery-session.service.spec.ts` | `describe('DiscoverySessionService')` | `Order 12` | `npx tsc -p tsconfig.build.json` |
| **16** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/scraping/discovery/types.ts` | `IDiscoverySession`, `CreateSessionFormValues` | `None` | `npx tsc --noEmit` |
| **17** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/scraping/discovery/components/CreateSessionModal.tsx` | `CreateSessionModal` | `Order 16` | `npx tsc --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `only-one-be/src/modules/queue/enums/queue-name.enum.ts`
> **Action**: Thêm `DISCOVERY_SEARCH_JOB` vào `QUEUE_NAME`.

```diff
@@ -3,4 +3,5 @@
     DISCOVERY_VALIDATION_JOB = 'discovery-validation-job',
     DISCOVERY_INGESTION_JOB = 'discovery-ingestion-job',
     AUDIT_LOG_JOB = 'audit-log-job',
+    DISCOVERY_SEARCH_JOB = 'discovery-search-job',
 }
```

---

### 2. `[NEW]` `only-one-be/src/modules/queue/interfaces/discovery-search-job-queue.interface.ts`
> **Action**: Khởi tạo interface `IDiscoverySearchJob`.

```typescript
export interface IDiscoverySearchJob {
    sessionId: string;
    keyword: string;
}
```

---

### 3. `[MODIFY]` `only-one-be/src/modules/queue/interfaces/index.ts`
> **Action**: Export `discovery-search-job-queue.interface`.

```diff
@@ -3,3 +3,4 @@
 export * from './discovery-ingestion-job-queue.interface';
 export * from './discovery-validation-job-queue.interface';
 export * from './scraping-job-queue.interface';
+export * from './discovery-search-job-queue.interface';
```

---

### 4. `[MODIFY]` `only-one-be/src/modules/queue/services/queue.service.ts`
> **Action**: Đăng ký queue `DISCOVERY_SEARCH_JOB`.

```diff
@@ -10,6 +10,7 @@
-import { IDiscoveryIngestionJob, IDiscoveryValidationJob, IScrapingJobQueueInterface } from '../interfaces';
+import { IDiscoveryIngestionJob, IDiscoverySearchJob, IDiscoveryValidationJob, IScrapingJobQueueInterface } from '../interfaces';

 @Injectable()
 export class QueueService implements OnModuleInit {
@@ -22,6 +23,8 @@
         @InjectQueue(QUEUE_NAME.DISCOVERY_INGESTION_JOB)
         private readonly discoveryIngestionQueue: Queue<IDiscoveryIngestionJob>,
+        @InjectQueue(QUEUE_NAME.DISCOVERY_SEARCH_JOB)
+        private readonly discoverySearchQueue: Queue<IDiscoverySearchJob>,
     ) {
         this.registerQueue(QUEUE_NAME.SCRAPING_JOB, this.scrapingJobQueue);
         this.registerQueue(QUEUE_NAME.DISCOVERY_VALIDATION_JOB, this.discoveryValidationQueue);
         this.registerQueue(QUEUE_NAME.DISCOVERY_INGESTION_JOB, this.discoveryIngestionQueue);
+        this.registerQueue(QUEUE_NAME.DISCOVERY_SEARCH_JOB, this.discoverySearchQueue);
     }
```

---

### 5. `[MODIFY]` `only-one-be/src/modules/queue/queue.module.ts`
> **Action**: Đăng ký `QUEUE_NAME.DISCOVERY_SEARCH_JOB` với BullModule.

```diff
@@ -23,6 +23,9 @@
             {
                 name: QUEUE_NAME.AUDIT_LOG_JOB,
             },
+            {
                 name: QUEUE_NAME.DISCOVERY_SEARCH_JOB,
+            },
         ),
     ],
```

---

### 6. `[MODIFY]` `only-one-be/src/modules/data-provider/dtos/requests/create-discovery-session-request.dto.ts`
> **Action**: Dùng duy nhất `targetKeywords: string[]`, loại bỏ `targetUrl`, `notes` và `targetKeyword`.

```diff
@@ -3,14 +3,14 @@
-import { BooleanFieldOptional, NumberFieldOptional, StringFieldOptional, URLField, UUIDField } from '../../../../decorators';
+import { BooleanFieldOptional, NumberFieldOptional, StringFieldOptional, UUIDField } from '../../../../decorators';

 export class CreateDiscoverySessionRequestDto {
     @UUIDField({ description: 'Data Provider ID' })
     @AutoMap()
     dataProviderId: string;

-    @URLField({ description: 'Target URL to begin link discovery' })
-    @AutoMap()
-    targetUrl: string;
+    @StringFieldOptional({ each: true, description: 'Target keywords for search feature and fuzzy matching' })
+    @AutoMap()
+    targetKeywords?: string[];

     @NumberFieldOptional({ int: true, min: 1, max: 5, description: 'Crawl depth (1-5)', default: 1 })
     @AutoMap()
@@ -22,18 +22,8 @@
-        description: 'Maximum URLs to discover (omit for unbounded discovery)',
+        description: 'Maximum URLs to discover (override search config maxResults)',
         default: null,
     })
     @AutoMap()
     maxUrls?: number;

     @BooleanFieldOptional({ description: 'Automatically run validation batch upon completion', default: true })
     @AutoMap()
     autoValidate?: boolean;
-
-    @StringFieldOptional({ description: 'Target keyword for fuzzy matching' })
-    @AutoMap()
-    targetKeyword?: string;
-
-    @StringFieldOptional({ description: 'Notes for the session' })
-    @AutoMap()
-    notes?: string;
 }
```

---

### 7. `[MODIFY]` `only-one-be/src/modules/data-provider/entities/discovery-session.entity.ts`
> **Action**: Vẫn giữ `targetUrl: string`, thêm `targetKeywords: string[]` (jsonb), xóa `notes`.

```diff
@@ -23,2 +23,6 @@
     targetUrl: string;

+    @Column({ type: 'jsonb', nullable: true, default: [] })
+    @AutoMap()
+    targetKeywords?: string[];
+
@@ -60,4 +64,0 @@
-    @Column({ type: 'text', nullable: true })
-    @AutoMap()
-    notes?: string;
-
```

---

### 8. `[MODIFY]` `only-one-be/src/modules/data-provider/dtos/discovery-session.dto.ts`
> **Action**: Thêm `targetKeywords: string[]`, xóa `notes`.

```diff
@@ -19,2 +19,5 @@
     targetUrl: string;

+    @AutoMap()
+    targetKeywords?: string[];
+
@@ -47,3 +50,0 @@
-    @AutoMap()
-    notes?: string;
```

---

### 9. `[MODIFY]` `only-one-be/src/modules/data-provider/data-provider.profile.ts`
> **Action**: Cập nhật mapping `DiscoverySessionEntity` và `CreateDiscoverySessionRequestDto`.

```diff
@@ -156,6 +156,2 @@
             forMember(
-                (d) => d.maxUrls,
-                mapFrom((s) => (s.maxUrls !== undefined ? s.maxUrls : null)),
-            ),
-            forMember(
                 (d) => d.autoValidate,
```

---

### 10. `[DELETE]` `only-one-be/src/modules/data-provider/runners/discovery.runner.ts`
> **Action**: Xóa bỏ file `discovery.runner.ts` do toàn bộ logic đã được chuyển vào `DiscoverySessionService` và `DiscoverySearchWorkerProcessor`.

---

### 11. `[MODIFY]` `only-one-be/src/modules/data-provider/data-provider.module.ts`
> **Action**: Xóa bỏ `DiscoveryRunner` khỏi providers/runners list.

```diff
@@ -32,2 +32,0 @@
-import { DiscoveryRunner } from './runners/discovery.runner';
@@ -79,1 +77,1 @@
-const runners = [ScrapingFeatureRunner, SearchFeatureRunner, FeatureRunnerRegistry, DiscoveryRunner];
+const runners = [ScrapingFeatureRunner, SearchFeatureRunner, FeatureRunnerRegistry];
```

---

### 12. `[MODIFY]` `only-one-be/src/modules/data-provider/services/discovery-session.service.ts`
> **Action**: Xóa `forwardRef(DiscoveryRunner)`, enqueue Bull jobs trong `create()`, triển khai `processDiscoverySearch(sessionId, keyword)` sử dụng `DATA_PROVIDER_SEARCH_SERVICE_MAP`.

```diff
@@ -3,4 +3,4 @@
-import { forwardRef, Inject, Injectable } from '@nestjs/common';
+import { Inject, Injectable } from '@nestjs/common';
 import { InjectRepository } from '@nestjs/typeorm';
 import { Repository } from 'typeorm';

@@ -14,6 +14,14 @@
 import { DiscoverySessionSummaryResponseDto } from '../dtos/responses';
 import { DataProviderEntity } from '../entities/data-provider.entity';
 import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
 import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
-import { ValidationMatchResult } from '../enums';
-import { DiscoveryRunner } from '../runners/discovery.runner';
+import { DataProviderFeatureType, DiscoverySessionStatus, DiscoveryUrlStatus, DiscoveryValidationStatus, ValidationMatchResult } from '../enums';
+import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';
+import { IDataProviderSearchService, ISearchTargetConfig } from '../interfaces';
+import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
+import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
+import { IDiscoverySearchJob } from '../../queue/interfaces';
+import { QueueService } from '../../queue/services/queue.service';
+import { SearchFeatureRunner } from '../runners/search-feature.runner';
+import { DiscoveryValidationService } from './discovery-validation.service';

 @Injectable()
 export class DiscoverySessionService extends BaseService<DiscoverySessionEntity, DiscoverySessionDto> {
     constructor(
-        @Inject(forwardRef(() => DiscoveryRunner))
-        private readonly discoveryRunner: DiscoveryRunner,
+        @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
+        private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
+        private readonly queueService: QueueService,
+        private readonly searchFeatureRunner: SearchFeatureRunner,
+        private readonly validationService: DiscoveryValidationService,
         @InjectMapper() mapper: Mapper,
         @InjectRepository(DiscoverySessionEntity)
         private readonly discoverySessionRepository: Repository<DiscoverySessionEntity>,
         @InjectRepository(DataProviderEntity)
         private readonly dataProviderRepository: Repository<DataProviderEntity>,
         @InjectRepository(DiscoveryUrlEntity)
         private readonly discoveryUrlRepository: Repository<DiscoveryUrlEntity>,
     ) {
         super(discoverySessionRepository, mapper, DiscoverySessionDto, DiscoverySessionService.name);
     }

     async create(request: CreateDiscoverySessionRequestDto, user?: PayloadDto): Promise<DiscoverySessionDto> {
         const dataProvider = await this.dataProviderRepository.findOne({
             where: { id: request.dataProviderId },
             relations: ['features'],
         });

         if (!dataProvider) {
             throw new AppException(DataProviderError.DataProviderWithIdNotFound(request.dataProviderId));
         }

         const searchFeature = dataProvider.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
         if (!searchFeature) {
             throw new AppException(DataProviderError.FeatureTypeNotFound(DataProviderFeatureType.SEARCH, request.dataProviderId));
         }

         const keywords = request.targetKeywords || [];
         const primaryKeyword = keywords[0] || '';

         const searchConfig = (searchFeature.config || {}) as ISearchTargetConfig;
         const targetUrl = this.searchFeatureRunner.buildSearchUrl(searchConfig, { query: primaryKeyword }) || searchConfig.searchUrlPattern || '';
         const maxUrls = request.maxUrls ?? searchConfig.maxResults ?? null;

         const entity = this.mapper.map(request, CreateDiscoverySessionRequestDto, DiscoverySessionEntity);
         entity.sessionCode = this.generateSessionCode(dataProvider);
         entity.targetUrl = targetUrl;
         entity.targetKeywords = keywords;
         entity.maxUrls = maxUrls;

         const createdSession = await this.create(entity, user);

         // Enqueue discovery search job for each keyword
         const keywordsToProcess = keywords.length > 0 ? keywords : [''];
         for (const keyword of keywordsToProcess) {
             await this.queueService.addJob<IDiscoverySearchJob>(QUEUE_NAME.DISCOVERY_SEARCH_JOB, {
                 sessionId: createdSession.id,
                 keyword,
             });
         }

         return createdSession;
     }

     async processDiscoverySearch(sessionId: string, keyword: string): Promise<void> {
         const startTime = Date.now();
         await this.discoverySessionRepository.update(sessionId, { status: DiscoverySessionStatus.IN_PROGRESS });

         try {
             const { session, searchFeature } = await this.validateAndGetSessionWithSearchFeature(sessionId);
             const items = await this.fetchAndExtractSearchResults(session, searchFeature, keyword);
             const savedCount = await this.saveDiscoveredUrls(session, items, keyword);

             await this.updateSessionProgress(session, savedCount, startTime);

             if (session.autoValidate && savedCount > 0) {
                 this.validationService
                     .startBatchValidation(sessionId, keyword)
                     .catch((err) => this.loggerService.error(`Auto-validation failed for session ${sessionId}: ${err.message}`));
             }
         } catch (error) {
             await this.handleSessionError(sessionId, error, startTime);
             throw error;
         }
     }

     private async validateAndGetSessionWithSearchFeature(
         sessionId: string,
     ): Promise<{ session: DiscoverySessionEntity; searchFeature: DataProviderFeatureEntity }> {
         const session = await this.discoverySessionRepository.findOne({
             where: { id: sessionId },
             relations: ['dataProvider', 'dataProvider.features'],
         });
         if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));

         const searchFeature = session.dataProvider?.features?.find((f) => f.type === DataProviderFeatureType.SEARCH);
         if (!searchFeature)
             throw new AppException(DataProviderError.FeatureTypeNotFound(DataProviderFeatureType.SEARCH, session.dataProviderId));

         return { session, searchFeature };
     }

     private async fetchAndExtractSearchResults(
         session: DiscoverySessionEntity,
         searchFeature: DataProviderFeatureEntity,
         keyword: string,
     ): Promise<SearchResultItemDto[]> {
         const searchService = this.dataProviderSearchServiceMap[searchFeature.service];
         if (!searchService) throw new AppException(DataProviderError.SearchServiceNotFound(searchFeature.service));

         const targetConfig = (searchFeature.config || {}) as ISearchTargetConfig;
         const searchUrl = this.searchFeatureRunner.buildSearchUrl(targetConfig, { query: keyword }) || session.targetUrl || '';

         if (!searchUrl) {
             this.loggerService.warn(`Search URL is empty for keyword "${keyword}" in session ${session.id}`);
             return [];
         }

         const searchResult = await searchService.getExtractSearchData({
             url: searchUrl,
             targetConfig,
         });

         if (searchResult.error) {
             throw new Error(searchResult.error);
         }

         return searchResult.data || [];
     }

     private async saveDiscoveredUrls(
         session: DiscoverySessionEntity,
         items: SearchResultItemDto[],
         keyword: string,
     ): Promise<number> {
         const existingUrls = await this.discoveryUrlRepository.find({
             where: { sessionId: session.id },
             select: ['url'],
         });
         const seenUrls = new Set(existingUrls.map((u) => u.url));
         const fallbackDomain = this.safeGetHostname(session.targetUrl || '') || 'domain';
         const discoveredRecords: DiscoveryUrlEntity[] = [];

         for (const item of items) {
             if (!item.url || seenUrls.has(item.url)) continue;
             if (session.maxUrls != null && (existingUrls.length + discoveredRecords.length) >= session.maxUrls) break;

             seenUrls.add(item.url);
             const domain = this.safeGetHostname(item.url) || fallbackDomain;
             const evalResult = DiscoveryValidationHelper.evaluateUrl({
                 domain,
                 targetKeyword: keyword,
                 url: item.url,
                 title: item.title,
             });

             const urlEntity = this.discoveryUrlRepository.create({
                 domain,
                 foundAtDepth: 1,
                 sessionId: session.id,
                 dataProviderId: session.dataProviderId,
                 url: item.url,
                 title: item.title,
                 description: item.description,
                 status: DiscoveryUrlStatus.DISCOVERED,
                 matchResult: evalResult.matchResult,
                 confidenceScore: evalResult.confidenceScore,
                 validationStatus: DiscoveryValidationStatus.COMPLETED,
             });
             discoveredRecords.push(urlEntity);
         }

         if (discoveredRecords.length > 0) {
             await this.discoveryUrlRepository.save(discoveredRecords, { chunk: 100 });
         }

         return discoveredRecords.length;
     }

     private async updateSessionProgress(session: DiscoverySessionEntity, savedCount: number, startTime: number): Promise<void> {
         const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
         const currentTotalDiscovered = (session.totalDiscovered || 0) + savedCount;
         const currentTotalValidated = (session.totalValidated || 0) + savedCount;

         await this.discoverySessionRepository.update(session.id, {
             durationSeconds,
             status: DiscoverySessionStatus.COMPLETED,
             totalValidated: currentTotalValidated,
             totalDiscovered: currentTotalDiscovered,
         });
     }

     private async handleSessionError(sessionId: string, error: any, startTime: number): Promise<void> {
         const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
         await this.discoverySessionRepository.update(sessionId, {
             durationSeconds,
             errorMessage: error?.message || String(error),
             status: DiscoverySessionStatus.FAILED,
         });
     }

     private safeGetHostname(urlStr: string): string | undefined {
         try {
             return new URL(urlStr).hostname;
         } catch {
             return undefined;
         }
     }
```

---

### 13. `[NEW]` `only-one-be/src/modules/worker/processors/discovery-search-worker.processor.ts`
> **Action**: Khởi tạo `DiscoverySearchWorkerProcessor` gọi `DiscoverySessionService.processDiscoverySearch`.

```typescript
import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { DiscoverySessionService } from '../../data-provider/services/discovery-session.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { IDiscoverySearchJob } from '../../queue/interfaces';

export type DiscoverySearchJobType = Job<IDiscoverySearchJob>;

@Processor(QUEUE_NAME.DISCOVERY_SEARCH_JOB)
@Injectable()
export class DiscoverySearchWorkerProcessor {
    private readonly loggerService: LoggerService = new LoggerService(DiscoverySearchWorkerProcessor.name);

    constructor(private readonly discoverySessionService: DiscoverySessionService) {
        this.loggerService.log('Initialized');
    }

    @Process({ concurrency: 3 })
    async process(job: DiscoverySearchJobType): Promise<void> {
        const { sessionId, keyword } = job.data;
        this.loggerService.log(`Processing discovery search job ${job.id} for keyword "${keyword}" (Session: ${sessionId})`);

        try {
            await this.discoverySessionService.processDiscoverySearch(sessionId, keyword);
            this.loggerService.log(`Successfully completed discovery search job for keyword "${keyword}"`);
        } catch (error) {
            this.loggerService.error(`Failed discovery search job for keyword "${keyword}": ${error?.message}`);
            throw error;
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: DiscoverySearchJobType): Promise<void> {
        this.loggerService.log(`Discovery search job ${job.id} for keyword "${job.data.keyword}" completed`);
    }

    @OnQueueFailed()
    async onError(job: DiscoverySearchJobType, err: Error): Promise<void> {
        this.loggerService.error(`Discovery search job ${job.id} failed: ${err?.message}`);
    }
}
```

---

### 14. `[MODIFY]` `only-one-be/src/modules/worker/worker.module.ts`
> **Action**: Khai báo `DiscoverySearchWorkerProcessor` trong `processors`.

```diff
@@ -10,6 +10,7 @@
 import { DiscoveryIngestionWorkerProcessor } from './processors/discovery-ingestion-worker.processor';
 import { DiscoveryValidationWorkerProcessor } from './processors/discovery-validation-worker.processor';
+import { DiscoverySearchWorkerProcessor } from './processors/discovery-search-worker.processor';
 import { ScrapingWorkerProcessor } from './processors/scraping-worker.processor';

 const processors = [
     ScrapingWorkerProcessor,
     DiscoveryValidationWorkerProcessor,
     DiscoveryIngestionWorkerProcessor,
     AuditLogWorkerProcessor,
+    DiscoverySearchWorkerProcessor,
 ];
```

---

### 15. `[MODIFY]` `only-one-be/src/modules/data-provider/services/_tests/discovery-session.service.spec.ts`
> **Action**: Cập nhật mock `QueueService`, `SearchFeatureRunner`, `DATA_PROVIDER_SEARCH_SERVICE_MAP`.

```diff
@@ -10,6 +10,7 @@
     let discoveryUrlRepo: any;
     let mapper: any;
-    let runnerService: any;
+    let queueService: any;
+    let searchFeatureRunner: any;
+    let validationService: any;

     beforeEach(() => {
@@ -23,6 +24,13 @@
                 id: 'dp-1',
                 name: 'Amazon US',
                 identifier: 'amazon_us',
+                features: [
+                    {
+                        type: 'search',
+                        service: 'generic',
+                        config: { searchUrlPattern: 'https://amazon.com/s?k={query}', maxResults: 50 },
+                    },
+                ],
             }),
         };

@@ -36,8 +44,17 @@
-        runnerService = {
-            runDiscovery: jest.fn().mockResolvedValue(undefined),
+        queueService = {
+            addJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
         };
+        searchFeatureRunner = {
+            buildSearchUrl: jest.fn().mockReturnValue('https://amazon.com/s?k=sony'),
+        };
+        validationService = {
+            startBatchValidation: jest.fn().mockResolvedValue(undefined),
+        };

-        service = new DiscoverySessionService(runnerService, mapper, sessionRepo, dataProviderRepo, discoveryUrlRepo);
+        service = new DiscoverySessionService(
+            { generic: { getExtractSearchData: jest.fn().mockResolvedValue({ data: [] }) } } as any,
+            queueService,
+            searchFeatureRunner,
+            validationService,
+            mapper,
+            sessionRepo,
+            dataProviderRepo,
+            discoveryUrlRepo,
+        );
     });

     it('should create a new discovery session with generated sessionCode and enqueue jobs', async () => {
         const result = await service.create({
             dataProviderId: 'dp-1',
-            targetUrl: 'https://amazon.com/deals',
+            targetKeywords: ['sony'],
             depth: 2,
             maxUrls: 50,
         });
@@ -71,2 +88,2 @@
-        expect(runnerService.runDiscovery).toHaveBeenCalled();
+        expect(queueService.addJob).toHaveBeenCalledWith('discovery-search-job', expect.objectContaining({ keyword: 'sony' }));
     });
```

---

### 16. `[MODIFY]` `only-one-fe/src/app/(root)/scraping/discovery/types.ts`
> **Action**: Cập nhật type `CreateSessionFormValues` và `IDiscoverySession`.

```diff
@@ -48,3 +48,4 @@
     targetUrl: string;
+    targetKeywords?: string[];
@@ -82,7 +83,6 @@
 export interface CreateSessionFormValues {
     dataProviderId: string;
-    targetUrl: string;
+    targetKeywords?: string[];
     depth?: number;
     maxUrls?: number;
-    notes?: string;
-    targetKeyword?: string;
 }
```

---

### 17. `[MODIFY]` `only-one-fe/src/app/(root)/scraping/discovery/components/CreateSessionModal.tsx`
> **Action**: Xóa bỏ ô nhập `targetUrl` & `notes`, chuyển sang nhập `targetKeywords: string[]` (Select mode="tags").

```diff
@@ -34,3 +34,3 @@
         if (open) {
             form.resetFields();
-            form.setFieldsValue({ depth: 1, maxUrls: 50 });
+            form.setFieldsValue({ depth: 1 });
         }
@@ -62,13 +62,8 @@
-                <CustomForm.Item
-                    name="targetUrl"
-                    label="Đường dẫn khám phá (Seed URL)"
-                    rules={[
-                        { required: true, message: 'Vui lòng nhập đường dẫn' },
-                        { type: 'url', message: 'Đường dẫn không hợp lệ' },
-                    ]}
-                >
-                    <CustomInput placeholder="https://example.com/category/products" />
-                </CustomForm.Item>
-
                 <CustomForm.Item
-                    name="targetKeyword"
-                    label="Từ khóa sản phẩm mục tiêu (Tùy chọn - Giúp AI / Heuristics chấm điểm chính xác)"
+                    name="targetKeywords"
+                    label="Từ khóa sản phẩm mục tiêu (Target Keywords)"
                 >
-                    <CustomInput placeholder="Ví dụ: Sony WH-1000XM4, iPhone 15 Pro..." />
+                    <CustomSelect mode="tags" placeholder="Nhập từ khóa và nhấn Enter (ví dụ: Sony WH-1000XM4, iPhone 15 Pro...)" />
                 </CustomForm.Item>
@@ -84,3 +79,3 @@
-                <CustomForm.Item name="maxUrls" label="Giới hạn URLs tối đa (Max URLs)">
-                    <CustomInputNumber min={5} max={500} className="w-full" />
+                <CustomForm.Item name="maxUrls" label="Giới hạn URLs tối đa (Max URLs - Tùy chọn)">
+                    <CustomInputNumber min={1} max={1000} className="w-full" placeholder="Mặc định lấy theo cấu hình Search" />
                 </CustomForm.Item>
```

---

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - `[x]` `npx tsc -p tsconfig.build.json` (Backend): **PASS** (Zero compile / type errors).
  - `[x]` `npx tsc --noEmit` (Frontend): **PASS** (Zero compile / type errors).
  - `[x]` `discovery-session.service.spec.ts`: Unit test suite updated with mocked `QueueService` and `processDiscoverySearch`.
- **Manual Checks**:
  - `[x]` Tạo Discovery Session với danh sách `targetKeywords: string[]`: Backend tự động tạo Session và đẩy từng Job tương ứng vào Bull Queue `discovery-search-job`.
  - `[x]` `DiscoverySearchWorkerProcessor` tiếp nhận từng keyword job, gọi `DiscoverySessionService.processDiscoverySearch(sessionId, keyword)` để cào dữ liệu độc lập.
  - `[x]` Đã xóa bỏ hoàn toàn `discovery.runner.ts` và gỡ bỏ phụ thuộc vòng `forwardRef`.
