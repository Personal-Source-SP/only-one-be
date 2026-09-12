---
status: done
slug: merge-validation-batch-into-discovery-session
started_at: 2026-09-12
completed_at: 2026-09-12
pr_url: ~
branch: ~
---

# Plan: Hợp nhất Validation Batch vào DiscoverySession & Loại bỏ DiscoveryValidationBatchEntity

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- **Cơ chế hiện tại**: Mỗi lần kích hoạt xác thực URL, hệ thống tạo mới một thực thể `DiscoveryValidationBatchEntity` riêng biệt. Tiến độ validation bị xé lẻ giữa bảng `discovery_sessions` (`totalValidated`) và `discovery_validation_batches` (`processedUrls`, `matchedUrls`, `noMatchUrls`, `status`).
- **Điểm nghẽn kỹ thuật**:
  - Dư thừa tầng abstraction (`DiscoveryValidationBatchEntity`, `DiscoveryValidationBatchService`, `DiscoveryValidationBatchDto`).
  - Tiềm ẩn race condition nếu nhiều batch được kích hoạt đồng thời cho cùng 1 session.
  - Phải duy trì cờ `isLatestLog` trên `discovery_validation_logs` và query sắp xếp phức tạp để lấy batch mới nhất.
- **Invariants bắt buộc duy trì**:
  - `DiscoveryUrlService` giữ nguyên API endpoints duyệt, từ chối và revalidate URL đơn lẻ (`revalidateDiscoveredUrl`, `submitUserAction`, `submitBulkUserActions`).
  - Thuật toán fuzzy match & evaluate trong `DiscoveryValidationHelper` giữ nguyên 100%.
  - Luồng Bull Queue (`DISCOVERY_VALIDATION_JOB`) tiếp tục xử lý bất đồng bộ theo từng URL.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

### 2.1 Type Signatures & Code Contracts

```typescript
// 1. Data Contract mở rộng trên DiscoverySessionEntity
@Column({ type: 'varchar', length: 20, default: ValidationBatchStatus.PENDING })
validationStatus: ValidationBatchStatus;

@Column({ type: 'integer', default: 0 })
matchedUrls: number;

@Column({ type: 'integer', default: 0 })
noMatchUrls: number;

@Column({ type: 'timestamptz', nullable: true })
validationStartedAt?: Date;

@Column({ type: 'timestamptz', nullable: true })
validationCompletedAt?: Date;

@Column({ type: 'text', nullable: true })
validationReasonCancelled?: string;

// 2. IDiscoveryValidationJob Payload (queue interface)
export interface IDiscoveryValidationJob {
    urlId: string;
    sessionId: string;
    targetKeyword?: string;
}

// 3. DiscoveryValidationLogEntity (loại bỏ validationBatchId)
@Column({ type: 'uuid' })
@Index()
sessionId: string;

@Column({ type: 'uuid' })
@Index()
discoveryUrlId: string;
```

### 2.2 AST Seams & Callers
- **`DiscoverySessionService`**: Thêm các methods quản lý validation lifecycle:
  - `startSessionValidation(sessionId: string, targetKeyword?: string): Promise<DiscoverySessionDto>`
  - `cancelSessionValidation(sessionId: string, reason?: string): Promise<boolean>`
  - `incrementValidationProgress(manager: EntityManager, sessionId: string, isMatched: boolean): Promise<void>`
  - `completeValidationIfFinished(manager: EntityManager, sessionId: string): Promise<boolean>`
- **`DiscoveryValidationWorkerProcessor`**: Inject `DiscoverySessionService` + `DiscoveryUrlService` + `DiscoveryValidationLogService`, gọi `incrementValidationProgress` trực tiếp trên session.
- **`DiscoveryValidationController`**: Inject `DiscoverySessionService` cho trigger validation và lấy session status.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes
```text
src/
├── migrations/
│   └── [NEW]    1765800000000-MergeValidationBatchIntoDiscoverySessions.ts # Migration cập nhật DB schema
├── modules/
│   ├── queue/interfaces/
│   │   └── [MODIFY] discovery-validation-job-queue.interface.ts # Bỏ batchId khỏi IDiscoveryValidationJob
│   ├── data-provider/
│   │   ├── entities/
│   │   │   ├── [MODIFY] discovery-session.entity.ts             # Thêm validation fields, bỏ validationBatches
│   │   │   ├── [MODIFY] discovery-validation-log.entity.ts       # Bỏ validationBatchId & quan hệ Batch
│   │   │   └── [DELETE] discovery-validation-batch.entity.ts     # Xóa entity Batch
│   │   ├── dtos/
│   │   │   ├── [MODIFY] discovery-session.dto.ts                # Thêm validation fields vào DTO
│   │   │   ├── [MODIFY] discovery-validation-log.dto.ts         # Bỏ validationBatchId
│   │   │   └── [DELETE] discovery-validation-batch.dto.ts       # Xóa DTO Batch
│   │   ├── services/
│   │   │   ├── [MODIFY] discovery-session.service.ts            # Quản lý trực tiếp validation lifecycle
│   │   │   ├── [MODIFY] discovery-validation-log.service.ts     # Bỏ Batch references
│   │   │   └── [DELETE] discovery-validation-batch.service.ts   # Xóa service Batch
│   │   ├── controllers/
│   │   │   └── [MODIFY] discovery-validation.controller.ts      # Gọi DiscoverySessionService thay vì BatchService
│   │   ├── data-provider.profile.ts                             # Bỏ mapping Batch, map validation fields
│   │   └── data-provider.module.ts                              # Bỏ Batch providers & entities
│   └── worker/processors/
│       └── [MODIFY] discovery-validation-worker.processor.ts    # Xử lý validation job cập nhật Session trực tiếp
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/migrations/1765800000000-MergeValidationBatchIntoDiscoverySessions.ts` | `MergeValidationBatchIntoDiscoverySessions1765800000000` | None | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/queue/interfaces/discovery-validation-job-queue.interface.ts` | `IDiscoveryValidationJob` | None | `npx tsc -p tsconfig.build.json` |
| **3** | `[x]` | `[DELETE]` | `src/modules/data-provider/entities/discovery-validation-batch.entity.ts` | File Deletion | None | `npx tsc -p tsconfig.build.json` |
| **4** | `[x]` | `[DELETE]` | `src/modules/data-provider/dtos/discovery-validation-batch.dto.ts` | File Deletion | None | `npx tsc -p tsconfig.build.json` |
| **5** | `[x]` | `[DELETE]` | `src/modules/data-provider/services/discovery-validation-batch.service.ts` | File Deletion | None | `npx tsc -p tsconfig.build.json` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/data-provider/entities/discovery-session.entity.ts` | `DiscoverySessionEntity` | Order 3 | `npx tsc -p tsconfig.build.json` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/discovery-session.dto.ts` | `DiscoverySessionDto` | Order 6 | `npx tsc -p tsconfig.build.json` |
| **8** | `[x]` | `[MODIFY]` | `src/modules/data-provider/entities/discovery-validation-log.entity.ts` | `DiscoveryValidationLogEntity` | Order 3 | `npx tsc -p tsconfig.build.json` |
| **9** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/discovery-validation-log.dto.ts` | `DiscoveryValidationLogDto` | Order 4, 8 | `npx tsc -p tsconfig.build.json` |
| **10** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-validation-log.service.ts` | `DiscoveryValidationLogService` | Order 8 | `npx tsc -p tsconfig.build.json` |
| **11** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-session.service.ts` | `DiscoverySessionService` | Order 2, 6, 10 | `npx tsc -p tsconfig.build.json` |
| **12** | `[x]` | `[MODIFY]` | `src/modules/worker/processors/discovery-validation-worker.processor.ts` | `DiscoveryValidationWorkerProcessor` | Order 2, 11 | `npx tsc -p tsconfig.build.json` |
| **13** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-validation.controller.ts` | `DiscoveryValidationController` | Order 11 | `npx tsc -p tsconfig.build.json` |
| **14** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.profile.ts` | `DataProviderProfile` | Order 6, 7, 8, 9 | `npx tsc -p tsconfig.build.json` |
| **15** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | `DataProviderModule` | Order 3, 5, 11 | `npx tsc -p tsconfig.build.json` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/migrations/1765800000000-MergeValidationBatchIntoDiscoverySessions.ts`
> **Action**: Migration cập nhật cấu trúc bảng `discovery_sessions`, `discovery_validation_logs` và xóa bảng `discovery_validation_batches`.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeValidationBatchIntoDiscoverySessions1765800000000 implements MigrationInterface {
    name = 'MergeValidationBatchIntoDiscoverySessions1765800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add validation metrics columns to discovery_sessions
        await queryRunner.query(`
            ALTER TABLE "discovery_sessions"
            ADD COLUMN IF NOT EXISTS "validation_status" character varying(20) NOT NULL DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS "matched_urls" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "no_match_urls" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "validation_started_at" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS "validation_completed_at" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS "validation_reason_cancelled" text;
        `);

        // 2. Drop validation_batch_id from discovery_validation_logs
        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs" DROP CONSTRAINT IF EXISTS "FK_discovery_validation_logs_validation_batch";
        `);
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_discovery_validation_logs_validation_batch_id";
        `);
        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs" DROP COLUMN IF EXISTS "validation_batch_id";
        `);

        // 3. Add FK from discovery_validation_logs to discovery_sessions
        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs"
            ADD CONSTRAINT "FK_discovery_validation_logs_session"
            FOREIGN KEY ("session_id") REFERENCES "discovery_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        `);

        // 4. Drop discovery_validation_batches table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "discovery_validation_batches";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate discovery_validation_batches table if reverted
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "discovery_validation_batches" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "session_id" uuid NOT NULL,
                "batch_number" character varying(50) NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'pending',
                "total_urls" integer NOT NULL DEFAULT 0,
                "processed_urls" integer NOT NULL DEFAULT 0,
                "matched_urls" integer NOT NULL DEFAULT 0,
                "no_match_urls" integer NOT NULL DEFAULT 0,
                "started_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "reason_cancelled" text,
                CONSTRAINT "PK_discovery_validation_batches_id" PRIMARY KEY ("id")
            );
        `);

        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs"
            DROP CONSTRAINT IF EXISTS "FK_discovery_validation_logs_session",
            ADD COLUMN IF NOT EXISTS "validation_batch_id" uuid;
        `);

        await queryRunner.query(`
            ALTER TABLE "discovery_sessions"
            DROP COLUMN IF EXISTS "validation_status",
            DROP COLUMN IF EXISTS "matched_urls",
            DROP COLUMN IF EXISTS "no_match_urls",
            DROP COLUMN IF EXISTS "validation_started_at",
            DROP COLUMN IF EXISTS "validation_completed_at",
            DROP COLUMN IF EXISTS "validation_reason_cancelled";
        `);
    }
}
```

### 2. `[MODIFY]` `src/modules/queue/interfaces/discovery-validation-job-queue.interface.ts`
> **Action**: Loại bỏ thuộc tính `batchId` khỏi `IDiscoveryValidationJob`.

```diff
 export interface IDiscoveryValidationJob {
     urlId: string;
     sessionId: string;
-    batchId: string;
     targetKeyword?: string;
 }
```

### 3, 4, 5. `[DELETE]` Batch files
> **Action**: Xóa bỏ hoàn toàn 3 tệp entity, dto, service của Batch:
- `src/modules/data-provider/entities/discovery-validation-batch.entity.ts`
- `src/modules/data-provider/dtos/discovery-validation-batch.dto.ts`
- `src/modules/data-provider/services/discovery-validation-batch.service.ts`

### 6. `[MODIFY]` `src/modules/data-provider/entities/discovery-session.entity.ts`
> **Action**: Thêm các cột validation metrics và đổi quan hệ sang `validationLogs`.

```diff
-import { DiscoveryValidationBatchEntity } from './discovery-validation-batch.entity';
+import { ValidationBatchStatus } from '../enums';
+import { DiscoveryValidationLogEntity } from './discovery-validation-log.entity';

 @Entity({ name: 'discovery_sessions', synchronize: false })
 export class DiscoverySessionEntity extends AbstractEntity {
     ...
     @Column({ type: 'integer', default: 0 })
     @AutoMap()
     totalValidated: number;

+    @Column({ type: 'varchar', length: 20, default: ValidationBatchStatus.PENDING })
+    @AutoMap()
+    validationStatus: ValidationBatchStatus;
+
+    @Column({ type: 'integer', default: 0 })
+    @AutoMap()
+    matchedUrls: number;
+
+    @Column({ type: 'integer', default: 0 })
+    @AutoMap()
+    noMatchUrls: number;
+
+    @Column({ type: 'timestamptz', nullable: true })
+    @AutoMap()
+    validationStartedAt?: Date;
+
+    @Column({ type: 'timestamptz', nullable: true })
+    @AutoMap()
+    validationCompletedAt?: Date;
+
+    @Column({ type: 'text', nullable: true })
+    @AutoMap()
+    validationReasonCancelled?: string;

     @OneToMany(() => DiscoveryUrlEntity, (u) => u.discoverySession)
     @AutoMap(() => [DiscoveryUrlEntity])
     discoveryUrls: Relation<DiscoveryUrlEntity>[];

-    @OneToMany(() => DiscoveryValidationBatchEntity, (b) => b.discoverySession)
-    @AutoMap(() => [DiscoveryValidationBatchEntity])
-    validationBatches: Relation<DiscoveryValidationBatchEntity>[];
+    @OneToMany(() => DiscoveryValidationLogEntity, (l) => l.discoverySession)
+    @AutoMap(() => [DiscoveryValidationLogEntity])
+    validationLogs: Relation<DiscoveryValidationLogEntity>[];
 }
```

### 7. `[MODIFY]` `src/modules/data-provider/dtos/discovery-session.dto.ts`
> **Action**: Thêm các trường validation vào DTO.

```diff
+import { ValidationBatchStatus } from '../enums';

 export class DiscoverySessionDto extends AbstractDto {
     ...
     @AutoMap()
     totalValidated: number;

+    @AutoMap()
+    validationStatus: ValidationBatchStatus;
+
+    @AutoMap()
+    matchedUrls: number;
+
+    @AutoMap()
+    noMatchUrls: number;
+
+    @AutoMap()
+    validationStartedAt?: Date;
+
+    @AutoMap()
+    validationCompletedAt?: Date;
+
+    @AutoMap()
+    validationReasonCancelled?: string;
 }
```

### 8. `[MODIFY]` `src/modules/data-provider/entities/discovery-validation-log.entity.ts`
> **Action**: Loại bỏ `validationBatchId` và quan hệ `DiscoveryValidationBatchEntity`, gắn quan hệ `discoverySession`.

```diff
-import { DiscoveryValidationBatchEntity } from './discovery-validation-batch.entity';
+import { DiscoverySessionEntity } from './discovery-session.entity';

 @Entity({ name: 'discovery_validation_logs', synchronize: false })
 export class DiscoveryValidationLogEntity extends AbstractEntity {
     @Column({ type: 'uuid' })
     @AutoMap()
     @Index()
     sessionId: string;

     @Column({ type: 'uuid' })
     @AutoMap()
     @Index()
     discoveryUrlId: string;

-    @Column({ type: 'uuid' })
-    @AutoMap()
-    @Index()
-    validationBatchId: string;
     ...
     @ManyToOne(() => DiscoveryUrlEntity, (u) => u.validationLogs, { onDelete: 'CASCADE' })
     @JoinColumn({ name: 'discovery_url_id' })
     @AutoMap(() => DiscoveryUrlEntity)
     discoveryUrl: Relation<DiscoveryUrlEntity>;

-    @ManyToOne(() => DiscoveryValidationBatchEntity, (b) => b.validationLogs, { onDelete: 'CASCADE' })
-    @JoinColumn({ name: 'validation_batch_id' })
-    @AutoMap(() => DiscoveryValidationBatchEntity)
-    validationBatch: Relation<DiscoveryValidationBatchEntity>;
+    @ManyToOne(() => DiscoverySessionEntity, (s) => s.validationLogs, { onDelete: 'CASCADE' })
+    @JoinColumn({ name: 'session_id' })
+    @AutoMap(() => DiscoverySessionEntity)
+    discoverySession: Relation<DiscoverySessionEntity>;
 }
```

### 9. `[MODIFY]` `src/modules/data-provider/dtos/discovery-validation-log.dto.ts`
> **Action**: Xóa `validationBatchId` và `validationBatch` khỏi log DTO.

```diff
-import { DiscoveryValidationBatchDto } from './discovery-validation-batch.dto';

 export class DiscoveryValidationLogDto extends AbstractDto {
     @AutoMap()
     sessionId: string;

     @AutoMap()
     discoveryUrlId: string;

     @AutoMap(() => DiscoveryUrlDto)
     discoveryUrl?: DiscoveryUrlDto;

-    @AutoMap()
-    validationBatchId: string;
-
-    @AutoMap(() => DiscoveryValidationBatchDto)
-    validationBatch?: DiscoveryValidationBatchDto;
     ...
 }
```

### 10. `[MODIFY]` `src/modules/data-provider/services/discovery-validation-log.service.ts`
> **Action**: Cập nhật method `createValidationLog` không cần `validationBatchId`.

```diff
 export class DiscoveryValidationLogService extends BaseService<DiscoveryValidationLogEntity, DiscoveryValidationLogDto> {
     ...
 }
```

### 11. `[MODIFY]` `src/modules/data-provider/services/discovery-session.service.ts`
> **Action**: Thêm các methods validation lifecycle (`startSessionValidation`, `cancelSessionValidation`, `incrementValidationProgress`, `completeValidationIfFinished`).

```diff
-import { DiscoveryValidationBatchService } from './discovery-validation-batch.service';
+import { DiscoveryValidationLogService } from './discovery-validation-log.service';
+import { ValidationBatchStatus } from '../enums';

 @Injectable()
 export class DiscoverySessionService extends BaseService<DiscoverySessionEntity, DiscoverySessionDto> {
     constructor(
         private readonly queueService: QueueService,
         private readonly searchFeatureRunner: SearchFeatureRunner,
         private readonly dataProviderService: DataProviderService,
         private readonly discoveryUrlService: DiscoveryUrlService,
-        @Inject(forwardRef(() => DiscoveryValidationBatchService))
-        private readonly discoveryValidationBatchService: DiscoveryValidationBatchService,
+        private readonly discoveryValidationLogService: DiscoveryValidationLogService,
         @InjectMapper() mapper: Mapper,
         @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
         private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
         @InjectRepository(DiscoverySessionEntity)
         private readonly discoverySessionRepository: Repository<DiscoverySessionEntity>,
     )

+    async startSessionValidation(sessionId: string, targetKeyword?: string): Promise<DiscoverySessionDto> {
+        const session = await this.findById(sessionId);
+        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));
+        if (session.validationStatus === ValidationBatchStatus.PROCESSING) {
+            throw new AppException(DataProviderError.ValidationBatchAlreadyRunning);
+        }
+
+        const urls = await this.discoveryUrlService.findListByFilter({ sessionId });
+        if (!urls.length) throw new AppException(DataProviderError.NoDiscoveredUrlsFound(sessionId));
+
+        await this.discoverySessionRepository.update(sessionId, {
+            validationStatus: ValidationBatchStatus.PROCESSING,
+            validationStartedAt: new Date(),
+            validationCompletedAt: null,
+            validationReasonCancelled: null,
+            matchedUrls: 0,
+            noMatchUrls: 0,
+            totalValidated: 0,
+        });
+
+        await this.discoveryValidationLogService.markPreviousLogsNotLatest({ sessionId });
+
+        const jobs = urls.map((u) => ({
+            data: {
+                sessionId,
+                targetKeyword,
+                urlId: u.id,
+            } as IDiscoveryValidationJob,
+            opts: {
+                attempts: 3,
+                removeOnComplete: true,
+                backoff: { type: 'exponential', delay: 1000 },
+            },
+        }));
+
+        await this.queueService.addBulkJob(QUEUE_NAME.DISCOVERY_VALIDATION_JOB, jobs);
+        return await this.findById(sessionId);
+    }
+
+    async cancelSessionValidation(sessionId: string, reason?: string): Promise<boolean> {
+        const session = await this.findById(sessionId);
+        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));
+
+        const result = await this.discoverySessionRepository.update(sessionId, {
+            validationStatus: ValidationBatchStatus.CANCELLED,
+            validationReasonCancelled: reason,
+            validationCompletedAt: new Date(),
+        });
+
+        return (result.affected ?? 0) > 0;
+    }
+
+    async incrementValidationProgress(manager: EntityManager, sessionId: string, isMatched: boolean): Promise<void> {
+        await manager
+            .createQueryBuilder()
+            .update(DiscoverySessionEntity)
+            .set({
+                totalValidated: () => 'total_validated + 1',
+                matchedUrls: () => (isMatched ? 'matched_urls + 1' : 'matched_urls'),
+                noMatchUrls: () => (!isMatched ? 'no_match_urls + 1' : 'no_match_urls'),
+            })
+            .where('id = :sessionId', { sessionId })
+            .execute();
+    }
+
+    async completeValidationIfFinished(manager: EntityManager, sessionId: string): Promise<boolean> {
+        const session = await manager.findOne(DiscoverySessionEntity, { where: { id: sessionId } });
+        if (session && session.totalValidated >= session.totalDiscovered) {
+            await manager.update(DiscoverySessionEntity, sessionId, {
+                validationStatus: ValidationBatchStatus.COMPLETED,
+                validationCompletedAt: new Date(),
+            });
+            return true;
+        }
+        return false;
+    }
```

### 12. `[MODIFY]` `src/modules/worker/processors/discovery-validation-worker.processor.ts`
> **Action**: Inject `DiscoverySessionService`, `DiscoveryUrlService`, `DiscoveryValidationLogService` và `DataSource` để validate và ghi log atomic.

```diff
-import { DiscoveryValidationBatchService } from '../../data-provider/services/discovery-validation-batch.service';
+import { DataSource } from 'typeorm';
+import { DiscoverySessionService } from '../../data-provider/services/discovery-session.service';
+import { DiscoveryUrlService } from '../../data-provider/services/discovery-url.service';
+import { DiscoveryValidationLogService } from '../../data-provider/services/discovery-validation-log.service';
+import { DiscoveryValidationHelper } from '../../data-provider/helpers/discovery-validation.helper';
+import { DiscoveryUrlEntity } from '../../data-provider/entities/discovery-url.entity';
+import { DiscoveryValidationLogEntity } from '../../data-provider/entities/discovery-validation-log.entity';
+import { DiscoveryValidationStatus, ValidationMatchResult, ValidationBatchStatus } from '../../data-provider/enums';

 @Processor(QUEUE_NAME.DISCOVERY_VALIDATION_JOB)
 @Injectable()
 export class DiscoveryValidationWorkerProcessor {
     constructor(
-        private readonly discoveryValidationBatchService: DiscoveryValidationBatchService
+        private readonly dataSource: DataSource,
+        private readonly discoverySessionService: DiscoverySessionService,
+        private readonly discoveryUrlService: DiscoveryUrlService,
+        private readonly discoveryValidationLogService: DiscoveryValidationLogService,
     ) {}

     @Process({ concurrency: 5 })
     async process(job: DiscoveryValidationJobType): Promise<void> {
-        const { urlId, sessionId, batchId } = job.data;
+        const { urlId, sessionId, targetKeyword } = job.data;
+        const startTime = Date.now();
+
+        const session = await this.discoverySessionService.findById(sessionId);
+        if (!session || session.validationStatus === ValidationBatchStatus.CANCELLED) {
+            return;
+        }
+
+        const url = await this.discoveryUrlService.findById(urlId);
+        if (!url) return;
+
+        const evalResult = DiscoveryValidationHelper.evaluateUrl({
+            targetKeyword,
+            url: url.url,
+            title: url.title,
+            domain: url.domain,
+        });
+
+        const isMatched =
+            evalResult.matchResult === ValidationMatchResult.EXACT_MATCH || evalResult.matchResult === ValidationMatchResult.PARTIAL_MATCH;
+
+        await this.dataSource.transaction(async (manager) => {
+            await manager.update(DiscoveryUrlEntity, urlId, {
+                matchResult: evalResult.matchResult,
+                confidenceScore: evalResult.confidenceScore,
+                validationStatus: DiscoveryValidationStatus.COMPLETED,
+            });
+
+            await manager.save(
+                DiscoveryValidationLogEntity,
+                this.discoveryValidationLogService.createValidationLog({
+                    sessionId,
+                    isLatestLog: true,
+                    discoveryUrlId: urlId,
+                    operationStatus: 'completed',
+                    reason: evalResult.reason,
+                    matchResult: evalResult.matchResult,
+                    confidenceScore: evalResult.confidenceScore,
+                    matchedCriteria: evalResult.matchedCriteria,
+                    processingDuration: Date.now() - startTime,
+                }),
+            );
+
+            await this.discoverySessionService.incrementValidationProgress(manager, sessionId, isMatched);
+            await this.discoverySessionService.completeValidationIfFinished(manager, sessionId);
+        });
     }
```

### 13. `[MODIFY]` `src/modules/data-provider/controllers/discovery-validation.controller.ts`
> **Action**: Sử dụng `DiscoverySessionService` cho trigger validation và lấy thông tin session.

```diff
-import { DiscoveryValidationBatchDto } from '../dtos/discovery-validation-batch.dto';
-import { DiscoveryValidationBatchService } from '../services/discovery-validation-batch.service';
+import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
+import { DiscoverySessionService } from '../services/discovery-session.service';

 @ApiTags('Discovery Validations')
 @Controller('discovery-validations')
 @Auth()
 export class DiscoveryValidationController {
     constructor(
-        private readonly batchService: DiscoveryValidationBatchService,
+        private readonly discoverySessionService: DiscoverySessionService,
         private readonly discoveryUrlService: DiscoveryUrlService,
     ) {}

     @Post({
         path: ':sessionId/validate',
         summary: 'Trigger validation on discovery session URLs',
-        responseDto: DiscoveryValidationBatchDto,
+        responseDto: DiscoverySessionDto,
     })
     async triggerValidation(
         @UUIDParam('sessionId') sessionId: string,
         @Body() request?: TriggerValidationRequestDto,
-    ): Promise<DiscoveryValidationBatchDto> {
-        return await this.batchService.startBatchValidation(sessionId, request?.targetKeyword);
+    ): Promise<DiscoverySessionDto> {
+        return await this.discoverySessionService.startSessionValidation(sessionId, request?.targetKeyword);
     }
```

### 14. `[MODIFY]` `src/modules/data-provider/data-provider.profile.ts`
> **Action**: Xóa mapping của Batch, thêm mapping cho validation fields trên `DiscoverySessionEntity` $\rightarrow$ `DiscoverySessionDto`.

### 15. `[MODIFY]` `src/modules/data-provider/data-provider.module.ts`
> **Action**: Loại bỏ `DiscoveryValidationBatchEntity` và `DiscoveryValidationBatchService` khỏi module.

---

## Section 5. Test Cases & Verification

### Automated Tests
- Chạy TypeORM migration:
  ```bash
  npm run migration:run
  ```
- Kiểm tra toàn diện TypeScript build:
  ```bash
  npx tsc -p tsconfig.build.json
  ```
- Kiểm tra frontend build:
  ```bash
  npx tsc --noEmit
  ```

### Manual Checks
1. Kiểm tra database sau khi chạy migration:
   - Bảng `discovery_sessions` có đủ các cột: `validation_status`, `matched_urls`, `no_match_urls`, `validation_started_at`, `validation_completed_at`, `validation_reason_cancelled`.
   - Bảng `discovery_validation_batches` đã được xóa sạch.
   - Bảng `discovery_validation_logs` không còn cột `validation_batch_id` và FK trỏ thẳng sang `discovery_sessions`.
2. Gọi `POST /discovery-validations/:sessionId/validate`:
   - Xác nhận `validationStatus` của session chuyển sang `processing`.
   - Xác nhận các jobs được đẩy vào Redis queue `discovery-validation-job`.
3. Theo dõi worker:
   - `totalValidated`, `matchedUrls`, `noMatchUrls` trên `DiscoverySessionEntity` tăng dần chính xác.
   - Khi `totalValidated === totalDiscovered`, `validationStatus` tự động chuyển sang `completed`.
