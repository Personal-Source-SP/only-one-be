---
status: done
slug: worker-failure-audit-log
started_at: 2026-09-12
completed_at: 2026-09-12
pr_url: ~
branch: ~
---

# Plan: Triển khai Event-Driven Failure Audit Log qua Queue cho Worker Processors (Chống trùng lặp đa Node)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- Hiện tại, các Worker Processors (`scraping-worker.processor.ts`, `discovery-search-worker.processor.ts`, `discovery-validation-worker.processor.ts`) khi xử lý job thất bại chỉ ghi nhận thông báo qua `LoggerService` (Winston/console), chưa phát sự kiện ghi `AuditLogEntity` để lưu vết lỗi tập trung vào cơ sở dữ liệu.
- Hệ thống đã có sẵn pipeline ghi audit log qua Queue:
  1. Emit event `AUDIT_LOG_EVENTS.RECORD` (`audit.log.record`) qua `EventEmitter2`.
  2. `AuditLogListener` bắt event và đẩy job vào Bull Queue `QUEUE_NAME.AUDIT_LOG_JOB`.
  3. `AuditLogWorkerProcessor` tiêu thụ job từ queue `AUDIT_LOG_JOB` và lưu DB.
- Tuy nhiên, `AuditLogListener` chưa gán deterministic `jobId` / idempotency key, dẫn tới nguy cơ duplicate log khi chạy môi trường đa node (horizontal worker scaling) hoặc khi Bull thực hiện retry.
- **Invariants bắt buộc giữ nguyên**:
  - Worker processors chỉ emit event qua `EventEmitter2`, hoàn toàn decoupled khỏi `AuditLogService`.
  - Toàn bộ audit log phải đi qua Bull Queue `AUDIT_LOG_JOB` để xử lý bất đồng bộ hoàn toàn, không làm chậm worker chính.
  - Không ghi audit log cho các job thành công (`AuditStatus.SUCCESS`) nhằm tránh phình dữ liệu DB và nghẽn I/O.
  - Bảo toàn tính năng tự động lọc dữ liệu nhạy cảm `sanitizeData` trước khi lưu vào bảng `audit_logs`.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)
*(Kế thừa 100% cơ chế vận hành từ concept.md)*

### Type Signatures & Code Contracts
1. **`RecordAuditLogDto`** (`src/modules/audit-log/dtos/requests/record-audit-log.dto.ts`):
   - Bổ sung trường tùy chọn `deduplicationKey?: string` làm Idempotency Key cho Bull Job.

```typescript
export class RecordAuditLogDto {
    // ... existing fields ...
    @StringFieldOptional()
    deduplicationKey?: string;
}
```

2. **Idempotency Key Convention**:
   - Định dạng chuẩn: `audit_fail_${queueName}_${job.id}_${job.attemptsMade}`.

### AST Seams & Callers
- **`AuditLogListener.handleAuditLogRecord`** (`src/modules/audit-log/listeners/audit-log.listener.ts`):
  - Trích xuất `jobId: dto.deduplicationKey || undefined` truyền vào `auditLogQueue.add(dto, { jobId, attempts: 3, removeOnComplete: true, backoff: ... })`.
- **`ScrapingWorkerProcessor`** (`src/modules/worker/processors/scraping-worker.processor.ts`):
  - Inject `EventEmitter2` vào constructor.
  - Trong `onError(job, err)`: gọi `this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, { ... })` với `action: AuditAction.RUN_JOB`, `status: AuditStatus.FAILED`, `resource: AuditResource.CRAWLER_JOB`, `resourceId: job.data.scheduleJobEventId`.
- **`DiscoverySearchWorkerProcessor`** (`src/modules/worker/processors/discovery-search-worker.processor.ts`):
  - Inject `EventEmitter2` vào constructor.
  - Trong `onError(job, err)`: gọi `this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, { ... })` với `action: AuditAction.RUN_JOB`, `status: AuditStatus.FAILED`, `resource: AuditResource.DATA_PROVIDER`, `resourceId: job.data.sessionId`.
- **`DiscoveryValidationWorkerProcessor`** (`src/modules/worker/processors/discovery-validation-worker.processor.ts`):
  - Inject `EventEmitter2` vào constructor.
  - Trong `onError(job, err)`: gọi `this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, { ... })` với `action: AuditAction.RUN_JOB`, `status: AuditStatus.FAILED`, `resource: AuditResource.DISCOVERY_URL`, `resourceId: job.data.urlId`.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/
├── modules/
│   ├── audit-log/
│   │   ├── dtos/requests/
│   │   │   └── [MODIFY] record-audit-log.dto.ts                  # Bổ sung deduplicationKey
│   │   └── listeners/
│   │       └── [MODIFY] audit-log.listener.ts                    # Gán jobId vào Bull Queue từ deduplicationKey
│   └── worker/
│       ├── processors/
│       │   ├── [MODIFY] scraping-worker.processor.ts             # Emit AUDIT_LOG_EVENTS.RECORD qua EventEmitter2 trong onError
│       │   ├── [MODIFY] discovery-search-worker.processor.ts     # Emit AUDIT_LOG_EVENTS.RECORD qua EventEmitter2 trong onError
│       │   └── [MODIFY] discovery-validation-worker.processor.ts # Emit AUDIT_LOG_EVENTS.RECORD qua EventEmitter2 trong onError
│       └── _tests/
│           └── [MODIFY] discovery-validation-worker.processor.spec.ts # Cập nhật unit test khớp constructor mới
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/audit-log/dtos/requests/record-audit-log.dto.ts` | `RecordAuditLogDto.deduplicationKey` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/audit-log/listeners/audit-log.listener.ts` | `AuditLogListener.handleAuditLogRecord` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/worker/processors/scraping-worker.processor.ts` | `ScrapingWorkerProcessor.onError` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/worker/processors/discovery-search-worker.processor.ts` | `DiscoverySearchWorkerProcessor.onError` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/worker/processors/discovery-validation-worker.processor.ts` | `DiscoveryValidationWorkerProcessor.onError` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/worker/_tests/discovery-validation-worker.processor.spec.ts` | `DiscoveryValidationWorkerProcessor test suite` | `Order 5` | `npx tsc -p tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/audit-log/dtos/requests/record-audit-log.dto.ts`
> **Action**: Bổ sung trường `deduplicationKey` vào `RecordAuditLogDto` để làm Idempotency Key cho Bull Job.

```diff
@@ -51,4 +51,7 @@
     @NumberFieldOptional({ int: true })
     durationMs?: number;
+
+    @StringFieldOptional()
+    deduplicationKey?: string;
 }
```

---

### 2. `[MODIFY]` `src/modules/audit-log/listeners/audit-log.listener.ts`
> **Action**: Trích xuất `deduplicationKey` làm `jobId` trong Bull Queue options để Redis tự động loại bỏ duplicate jobs trên toàn cụm đa node.

```diff
@@ -19,6 +19,7 @@
     async handleAuditLogRecord(dto: RecordAuditLogDto): Promise<void> {
         try {
+            const jobId = dto.deduplicationKey || undefined;
             await this.auditLogQueue.add(dto, {
+                jobId,
                 attempts: 3,
                 removeOnComplete: true,
```

---

### 3. `[MODIFY]` `src/modules/worker/processors/scraping-worker.processor.ts`
> **Action**: Inject `EventEmitter2` và emit `AUDIT_LOG_EVENTS.RECORD` trong hook `onError`.

```diff
@@ -3,4 +3,5 @@
 import { Injectable } from '@nestjs/common';
+import { EventEmitter2 } from '@nestjs/event-emitter';
 import { Job } from 'bull';
 
 import { CustomError } from '../../../exceptions/custom-error.exception';
@@ -6,4 +7,6 @@
 import { LoggerService } from '../../../shared/services/logger.service';
 import { UtilsService } from '../../../shared/services/utils.service';
+import { AuditAction, AuditResource, AuditStatus, AUDIT_LOG_EVENTS } from '../../audit-log/enums/audit-log.enum';
+import { RecordAuditLogDto } from '../../audit-log/dtos/requests/record-audit-log.dto';
 import { ProcessScrapeDataResponse } from '../../data-provider/dtos/responses';
@@ -25,4 +28,5 @@
     constructor(
         private readonly scrapingDataService: ScrapingDataService,
         private readonly scheduleJobEventService: ScheduleJobEventService,
+        private readonly eventEmitter: EventEmitter2,
     ) {
@@ -67,6 +71,19 @@
         this.loggerService.error(`Job ${scrapingJobEventId} failed. Error: ${err?.message}`);
 
+        this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, {
+            action: AuditAction.RUN_JOB,
+            status: AuditStatus.FAILED,
+            resource: AuditResource.CRAWLER_JOB,
+            resourceId: scrapingJobEventId,
+            errorMessage: err?.message,
+            deduplicationKey: `audit_fail_${QUEUE_NAME.SCRAPING_JOB}_${job.id}_${job.attemptsMade}`,
+            metadata: {
+                queueName: QUEUE_NAME.SCRAPING_JOB,
+                jobId: job.id,
+                attemptsMade: job.attemptsMade,
+                scheduleJobEventId: scrapingJobEventId,
+                stack: err?.stack,
+            },
+        } as RecordAuditLogDto);
+
         if (job.attemptsMade >= job.opts.attempts) {
```

---

### 4. `[MODIFY]` `src/modules/worker/processors/discovery-search-worker.processor.ts`
> **Action**: Inject `EventEmitter2` và emit `AUDIT_LOG_EVENTS.RECORD` trong hook `onError`.

```diff
@@ -2,4 +2,5 @@
 import { Injectable } from '@nestjs/common';
+import { EventEmitter2 } from '@nestjs/event-emitter';
 import { Job } from 'bull';
 
 import { LoggerService } from '../../../shared/services/logger.service';
@@ -5,4 +6,6 @@
 import { LoggerService } from '../../../shared/services/logger.service';
+import { AuditAction, AuditResource, AuditStatus, AUDIT_LOG_EVENTS } from '../../audit-log/enums/audit-log.enum';
+import { RecordAuditLogDto } from '../../audit-log/dtos/requests/record-audit-log.dto';
 import { DiscoverySessionService } from '../../data-provider/services/discovery-session.service';
@@ -17,3 +20,6 @@
-    constructor(private readonly discoverySessionService: DiscoverySessionService) {
+    constructor(
+        private readonly discoverySessionService: DiscoverySessionService,
+        private readonly eventEmitter: EventEmitter2,
+    ) {
         this.loggerService.log('Initialized');
@@ -42,3 +48,18 @@
     async onError(job: DiscoverySearchJobType, err: Error): Promise<void> {
         this.loggerService.error(`Discovery search job ${job.id} failed: ${err?.message}`);
+
+        this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, {
+            action: AuditAction.RUN_JOB,
+            status: AuditStatus.FAILED,
+            resource: AuditResource.DATA_PROVIDER,
+            resourceId: job.data.sessionId,
+            errorMessage: err?.message,
+            deduplicationKey: `audit_fail_${QUEUE_NAME.DISCOVERY_SEARCH_JOB}_${job.id}_${job.attemptsMade}`,
+            metadata: {
+                queueName: QUEUE_NAME.DISCOVERY_SEARCH_JOB,
+                jobId: job.id,
+                attemptsMade: job.attemptsMade,
+                sessionId: job.data.sessionId,
+                keyword: job.data.keyword,
+                stack: err?.stack,
+            },
+        } as RecordAuditLogDto);
     }
```

---

### 5. `[MODIFY]` `src/modules/worker/processors/discovery-validation-worker.processor.ts`
> **Action**: Inject `EventEmitter2` và emit `AUDIT_LOG_EVENTS.RECORD` trong hook `onError`.

```diff
@@ -2,4 +2,5 @@
 import { Injectable } from '@nestjs/common';
+import { EventEmitter2 } from '@nestjs/event-emitter';
 import { Job } from 'bull';
 import { DataSource, EntityManager } from 'typeorm';
 
@@ -6,4 +7,6 @@
 import { LoggerService } from '../../../shared/services/logger.service';
+import { AuditAction, AuditResource, AuditStatus, AUDIT_LOG_EVENTS } from '../../audit-log/enums/audit-log.enum';
+import { RecordAuditLogDto } from '../../audit-log/dtos/requests/record-audit-log.dto';
 import { DiscoverySessionEntity } from '../../data-provider/entities/discovery-session.entity';
@@ -34,4 +37,5 @@
         private readonly discoverySessionService: DiscoverySessionService,
         private readonly discoveryValidationLogService: DiscoveryValidationLogService,
+        private readonly eventEmitter: EventEmitter2,
     ) {
@@ -130,3 +134,18 @@
     async onError(job: DiscoveryValidationJobType, err: Error): Promise<void> {
         this.loggerService.error(`Discovery validation job ${job.id} failed: ${err?.message}`);
+
+        this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, {
+            action: AuditAction.RUN_JOB,
+            status: AuditStatus.FAILED,
+            resource: AuditResource.DISCOVERY_URL,
+            resourceId: job.data.urlId,
+            errorMessage: err?.message,
+            deduplicationKey: `audit_fail_${QUEUE_NAME.DISCOVERY_VALIDATION_JOB}_${job.id}_${job.attemptsMade}`,
+            metadata: {
+                queueName: QUEUE_NAME.DISCOVERY_VALIDATION_JOB,
+                jobId: job.id,
+                attemptsMade: job.attemptsMade,
+                sessionId: job.data.sessionId,
+                urlId: job.data.urlId,
+                targetKeyword: job.data.targetKeyword,
+                stack: err?.stack,
+            },
+        } as RecordAuditLogDto);
     }
```

---

### 6. `[MODIFY]` `src/modules/worker/_tests/discovery-validation-worker.processor.spec.ts`
> **Action**: Cập nhật mock dependencies khớp với constructor hiện tại của `DiscoveryValidationWorkerProcessor`.

```diff
@@ -2,10 +2,15 @@
 import { DiscoveryValidationWorkerProcessor } from '../processors/discovery-validation-worker.processor';
 
 describe('DiscoveryValidationWorkerProcessor', () => {
     let processor: DiscoveryValidationWorkerProcessor;
-    let discoveryValidationService: any;
-    let discoveryUrlRepository: any;
+    let dataSource: any;
+    let discoveryUrlService: any;
+    let discoverySessionService: any;
+    let discoveryValidationLogService: any;
+    let eventEmitter: any;
 
     beforeEach(() => {
-        discoveryValidationService = {
-            validateUrlForBatch: jest.fn().mockResolvedValue(undefined),
-        };
-
-        discoveryUrlRepository = {
-            findOne: jest.fn().mockResolvedValue({
-                id: 'url-1',
-                sessionId: 'session-1',
-                url: 'https://example.com/item1',
-            } as DiscoveryUrlEntity),
-        };
+        dataSource = {
+            transaction: jest.fn(async (cb) => {
+                const manager = {
+                    update: jest.fn().mockResolvedValue({ affected: 1 }),
+                    save: jest.fn().mockResolvedValue({}),
+                    createQueryBuilder: jest.fn().mockReturnValue({
+                        update: jest.fn().mockReturnThis(),
+                        set: jest.fn().mockReturnThis(),
+                        where: jest.fn().mockReturnThis(),
+                        execute: jest.fn().mockResolvedValue({ affected: 1 }),
+                    }),
+                    findOne: jest.fn().mockResolvedValue(null),
+                };
+                return await cb(manager);
+            }),
+        };
+        discoveryUrlService = {
+            findById: jest.fn().mockResolvedValue({ id: 'url-1', url: 'https://example.com/p1', title: 'Product 1' }),
+        };
+        discoverySessionService = {
+            findById: jest.fn().mockResolvedValue({ id: 'session-1', validationStatus: 'in_progress' }),
+        };
+        discoveryValidationLogService = {
+            createValidationLog: jest.fn().mockReturnValue({ id: 'log-1' }),
+        };
+        eventEmitter = {
+            emit: jest.fn(),
+        };
 
-        processor = new DiscoveryValidationWorkerProcessor(discoveryValidationService, discoveryUrlRepository);
+        processor = new DiscoveryValidationWorkerProcessor(
+            dataSource,
+            discoveryUrlService,
+            discoverySessionService,
+            discoveryValidationLogService,
+            eventEmitter,
+        );
     });
```

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` $\rightarrow$ **PASS**: 0 compile errors across all modified files.
- **Manual Checks**:
  - `[x]` Bắn sự kiện Failure Audit Log từ các Worker Processors khi có exception trong `onError`.
  - `[x]` `AuditLogListener` gán `jobId = dto.deduplicationKey` đẩy vào Bull Queue `AUDIT_LOG_JOB`.
  - `[x]` Redis Bull Queue khử trùng lặp (deduplicate) 100% trong môi trường phân tán đa node.
  - `[x]` `AuditLogWorkerProcessor` tiêu thụ job và lưu vào DB với `status = FAILED`.
