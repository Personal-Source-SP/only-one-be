---
status: done
slug: optimize-discovery-url-ingestion-queries
started_at: 2026-09-12
completed_at: 2026-09-12
pr_url: ~
branch: ~
---

# Plan: Tối ưu hóa Truy vấn & Pipeline Ingest Discovery URL

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- **Điểm nghẽn truy vấn đơn lẻ**: `discovery-url.service.ts` (`ingestDiscoveredUrl`) thực thi tuần tự từ 5 đến 7 roundtrips database I/O riêng biệt cho mỗi URL (`findOne` URL $\rightarrow$ `findOne` Item by code $\rightarrow$ `findOne` Item by name $\rightarrow$ `create` Item $\rightarrow$ `findOne` DataProviderItem $\rightarrow$ `create` DataProviderItem $\rightarrow$ `update` URL status).
- **Điểm nghẽn hàng đợi & Batch Ingestion**: `batchIngest` đẩy $N$ URL thành $N$ BullMQ jobs đơn lẻ (`QUEUE_NAME.DISCOVERY_INGESTION_JOB`), làm bùng nổ số lượng query ($O(7N)$) và gây nguy cơ race condition giữa các concurrent workers (`concurrency: 5`) khi cùng tạo một Item mới.
- **Invariants bắt buộc duy trì**:
  - Tuân thủ quy tắc `[NEVER]` trong `only-one/rules.md`: Giữ nguyên thứ tự ưu tiên phân giải sản phẩm (`code` $\rightarrow$ fallback `name`).
  - Đảm bảo tính idempotent: Ingest lại một URL đã ingest không gây crash hoặc trùng lặp bản ghi.
  - Thin Worker Processor: Giữ worker processor chỉ làm nhiệm vụ ủy quyền (delegate), toàn bộ business logic bulk ingest nằm trong service layer.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md)*

### Type Signatures & Code Contracts
- **`IDiscoveryIngestionJob`** (`src/modules/queue/interfaces/discovery-ingestion-job-queue.interface.ts`):
  ```typescript
  export interface IDiscoveryIngestionJob {
      urlId?: string;
      urlIds?: string[];
      sessionId: string;
      dataProviderId: string;
  }
  ```
- **`DiscoveryUrlService`** (`src/modules/data-provider/services/discovery-url.service.ts`):
  ```typescript
  async ingestDiscoveredUrlsChunk(urlIds: string[]): Promise<IngestDiscoveredUrlResponseDto[]>;
  async ingestDiscoveredUrl(urlId: string): Promise<IngestDiscoveredUrlResponseDto>;
  async batchIngest(sessionId: string, urlIds?: string[]): Promise<IngestDiscoveryUrlResponseDto>;
  ```

### AST Seams & Callers
- **`src/modules/data-provider/services/discovery-url.service.ts`**:
  - `ingestDiscoveredUrl(urlId)`: Gộp 2 bước tra cứu `Item` thành 1 query `findListByFilter([{ code }, { name }])` và tra cứu in-memory.
  - `ingestDiscoveredUrlsChunk(urlIds)`: Bulk retrieval cho Items & DataProviderItems, deduplicate new items in-memory trước khi insert, bulk update URL status.
  - `batchIngest(sessionId, urlIds)`: Phân rã mảng URLs thành các chunk 50 records trước khi dispatch vào BullMQ queue.
- **`src/modules/worker/processors/discovery-ingestion-worker.processor.ts`**:
  - `process(job)`: Xử lý cả 2 trường hợp `job.data.urlIds` (chunked batch) và `job.data.urlId` (single fallback).

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes
```text
src/
├── modules/
│   ├── queue/
│   │   └── interfaces/
│   │       └── [MODIFY] discovery-ingestion-job-queue.interface.ts  # Mở rộng payload hỗ trợ urlIds[]
│   ├── data-provider/
│   │   └── services/
│   │       └── [MODIFY] discovery-url.service.ts                   # Tối ưu single query lookup + bulk chunking
│   └── worker/
│       └── processors/
│           └── [MODIFY] discovery-ingestion-worker.processor.ts    # Hỗ trợ chunked execution & bulk error handling
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/queue/interfaces/discovery-ingestion-job-queue.interface.ts` | `IDiscoveryIngestionJob` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-url.service.ts` | `DiscoveryUrlService.ingestDiscoveredUrl`, `DiscoveryUrlService.ingestDiscoveredUrlsChunk`, `DiscoveryUrlService.batchIngest` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/worker/processors/discovery-ingestion-worker.processor.ts` | `DiscoveryIngestionWorkerProcessor.process` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/queue/interfaces/discovery-ingestion-job-queue.interface.ts`
> **Action**: Cập nhật interface `IDiscoveryIngestionJob` hỗ trợ truyền mảng `urlIds` cho chunked batch job song song với `urlId` đơn lẻ.

```diff
@@ line 1 @@
 export interface IDiscoveryIngestionJob {
-    urlId: string;
+    urlId?: string;
+    urlIds?: string[];
     sessionId: string;
     dataProviderId: string;
 }
```

---

### 2. `[MODIFY]` `src/modules/data-provider/services/discovery-url.service.ts`
> **Action**: Tối ưu hoá truy vấn `ingestDiscoveredUrl`, thêm phương thức `ingestDiscoveredUrlsChunk` gom nhóm batch I/O, và cấu hình `batchIngest` đẩy job theo chunk 50 URLs.

```diff
@@ line 48 @@
     async ingestDiscoveredUrl(urlId: string): Promise<IngestDiscoveredUrlResponseDto> {
         const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
         if (!urlEntity) throw new AppException(DataProviderError.UrlNotFound(urlId));

         const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
         const name = urlEntity.title?.trim() || urlEntity.url;

         let item: ItemDto = null;
         let isNewItem = false;

-        // Step 1: Check by code
-        if (code) {
-            item = await this.itemService.findOneByFilter({ code });
-        }
-
-        // Step 2: Fallback to name
-        if (!item && name) {
-            item = await this.itemService.findOneByFilter({ name });
+        // Step 1 & 2: Combined single query check by code OR name
+        const itemConditions: FindOptionsWhere<ItemEntity>[] = [];
+        if (code) itemConditions.push({ code });
+        if (name) itemConditions.push({ name });
+
+        if (itemConditions.length > 0) {
+            const existingItems = await this.itemService.findListByFilter(itemConditions);
+            if (code) {
+                item = existingItems.find((i) => i.code === code) || null;
+            }
+            if (!item && name) {
+                item = existingItems.find((i) => i.name === name) || null;
+            }
         }

         // Step 3: Create new Item if not found
         if (!item) {
             item = await this.itemService.create({ name, code: code || undefined });
             isNewItem = true;
         }

         // Step 4: Check & create DataProviderItem
         let dataProviderItem = await this.dataProviderItemService.findOneByFilterAndOptions({
             itemId: item.id,
             itemUrl: urlEntity.url,
             dataProviderId: urlEntity.dataProviderId,
         });

         if (!dataProviderItem) {
             dataProviderItem = await this.dataProviderItemService.create({
                 itemId: item.id,
                 itemUrl: urlEntity.url,
                 dataProviderId: urlEntity.dataProviderId,
             });
         }

         // Step 5: Mark status INGESTED
         await this.discoveryUrlRepository.update(urlId, { status: DiscoveryUrlStatus.INGESTED });

         return new IngestDiscoveredUrlResponseDto({
             isNewItem,
             itemId: item.id,
             dataProviderItemId: dataProviderItem.id,
         });
     }

+    async ingestDiscoveredUrlsChunk(urlIds: string[]): Promise<IngestDiscoveredUrlResponseDto[]> {
+        if (!urlIds || !urlIds.length) return [];
+
+        const urls = await this.discoveryUrlRepository.find({ where: { id: In(urlIds) } });
+        if (!urls.length) return [];
+
+        // 1. Extract metadata for all URLs in chunk
+        const urlMetadataList = urls.map((urlEntity) => {
+            const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
+            const name = urlEntity.title?.trim() || urlEntity.url;
+            return { urlEntity, code, name };
+        });
+
+        // 2. Collect unique codes and names for bulk item lookup
+        const codes = Array.from(new Set(urlMetadataList.map((m) => m.code).filter(Boolean)));
+        const names = Array.from(new Set(urlMetadataList.map((m) => m.name).filter(Boolean)));
+
+        const itemConditions: FindOptionsWhere<ItemEntity>[] = [];
+        if (codes.length > 0) itemConditions.push({ code: In(codes) });
+        if (names.length > 0) itemConditions.push({ name: In(names) });
+
+        const existingItems = itemConditions.length > 0 ? await this.itemService.findListByFilter(itemConditions) : [];
+
+        const codeToItemMap = new Map<string, ItemDto>();
+        const nameToItemMap = new Map<string, ItemDto>();
+
+        for (const it of existingItems) {
+            if (it.code && !codeToItemMap.has(it.code)) codeToItemMap.set(it.code, it);
+            if (it.name && !nameToItemMap.has(it.name)) nameToItemMap.set(it.name, it);
+        }
+
+        // 3. Resolve Items for each URL (Deduplicating in-memory for newly created items)
+        const resolvedItems: { meta: typeof urlMetadataList[0]; item: ItemDto; isNewItem: boolean }[] = [];
+
+        for (const meta of urlMetadataList) {
+            let matchedItem: ItemDto = null;
+            let isNew = false;
+
+            if (meta.code && codeToItemMap.has(meta.code)) {
+                matchedItem = codeToItemMap.get(meta.code);
+            } else if (meta.name && nameToItemMap.has(meta.name)) {
+                matchedItem = nameToItemMap.get(meta.name);
+            }
+
+            if (!matchedItem) {
+                matchedItem = await this.itemService.create({ name: meta.name, code: meta.code || undefined });
+                isNew = true;
+                if (meta.code) codeToItemMap.set(meta.code, matchedItem);
+                if (meta.name) nameToItemMap.set(meta.name, matchedItem);
+            }
+
+            resolvedItems.push({ meta, item: matchedItem, isNewItem: isNew });
+        }
+
+        // 4. Bulk lookup existing DataProviderItems
+        const distinctDataProviderIds = Array.from(new Set(urls.map((u) => u.dataProviderId)));
+        const existingDataProviders = await this.dataProviderItemService.findListByFilter({
+            dataProviderId: In(distinctDataProviderIds),
+            itemUrl: In(urls.map((u) => u.url)),
+        });
+
+        const dpiMap = new Map<string, DataProviderItemDto>();
+        for (const dpi of existingDataProviders) {
+            dpiMap.set(`${dpi.dataProviderId}_${dpi.itemId}_${dpi.itemUrl}`, dpi);
+        }
+
+        // 5. Ensure DataProviderItems exist
+        const results: IngestDiscoveredUrlResponseDto[] = [];
+        for (const { meta, item, isNewItem } of resolvedItems) {
+            const key = `${meta.urlEntity.dataProviderId}_${item.id}_${meta.urlEntity.url}`;
+            let dpi = dpiMap.get(key);
+
+            if (!dpi) {
+                dpi = await this.dataProviderItemService.create({
+                    itemId: item.id,
+                    itemUrl: meta.urlEntity.url,
+                    dataProviderId: meta.urlEntity.dataProviderId,
+                });
+                dpiMap.set(key, dpi);
+            }
+
+            results.push(
+                new IngestDiscoveredUrlResponseDto({
+                    isNewItem,
+                    itemId: item.id,
+                    dataProviderItemId: dpi.id,
+                }),
+            );
+        }
+
+        // 6. Bulk update DiscoveryUrls status to INGESTED
+        const processedIds = urls.map((u) => u.id);
+        await this.discoveryUrlRepository.update({ id: In(processedIds) }, { status: DiscoveryUrlStatus.INGESTED });
+
+        return results;
+    }
```

```diff
@@ line 125 @@
         const targetUrlIds = urls.map((u) => u.id);
         await this.discoveryUrlRepository.update({ id: In(targetUrlIds) }, { status: DiscoveryUrlStatus.QUEUED });

-        const jobs = urls.map((u) => ({
-            data: {
-                urlId: u.id,
-                sessionId: u.sessionId,
-                dataProviderId: u.dataProviderId,
-            },
-            opts: {
-                attempts: 3,
-                backoff: {
-                    type: 'exponential',
-                    delay: 2000,
-                },
-                removeOnComplete: true,
-            },
-        }));
+        const CHUNK_SIZE = 50;
+        const jobs = [];
+        for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
+            const chunk = urls.slice(i, i + CHUNK_SIZE);
+            jobs.push({
+                data: {
+                    urlIds: chunk.map((u) => u.id),
+                    sessionId,
+                    dataProviderId: chunk[0].dataProviderId,
+                },
+                opts: {
+                    attempts: 3,
+                    backoff: {
+                        type: 'exponential',
+                        delay: 2000,
+                    },
+                    removeOnComplete: true,
+                },
+            });
+        }

         await this.queueService.addBulkJob(QUEUE_NAME.DISCOVERY_INGESTION_JOB, jobs);
```

---

### 3. `[MODIFY]` `src/modules/worker/processors/discovery-ingestion-worker.processor.ts`
> **Action**: Cập nhật processor để phân nhánh xử lý chunked URLs (`urlIds`) hoặc fallback single URL (`urlId`).

```diff
@@ line 23 @@
     @Process({ concurrency: 5 })
     async process(job: DiscoveryIngestionJobType): Promise<void> {
-        const { urlId, sessionId } = job.data;
-        this.loggerService.log(`Processing ingestion job ${job.id} for URL ${urlId} (Session: ${sessionId})`);
+        const { urlId, urlIds, sessionId } = job.data;
+        const targetIds = urlIds && urlIds.length > 0 ? urlIds : (urlId ? [urlId] : []);
+        this.loggerService.log(`Processing ingestion job ${job.id} for ${targetIds.length} URL(s) (Session: ${sessionId})`);

         try {
-            await this.discoveryUrlService.ingestDiscoveredUrl(urlId);
-            this.loggerService.log(`Successfully ingested discovery URL ${urlId}`);
+            if (urlIds && urlIds.length > 0) {
+                await this.discoveryUrlService.ingestDiscoveredUrlsChunk(urlIds);
+                this.loggerService.log(`Successfully ingested ${urlIds.length} URLs in job ${job.id}`);
+            } else if (urlId) {
+                await this.discoveryUrlService.ingestDiscoveredUrl(urlId);
+                this.loggerService.log(`Successfully ingested discovery URL ${urlId}`);
+            }
         } catch (error) {
-            this.loggerService.error(`Failed to ingest discovery URL ${urlId}: ${error?.message}`);
-            await this.discoveryUrlService.update(urlId, { status: DiscoveryUrlStatus.FAILED });
+            this.loggerService.error(`Failed to ingest discovery URLs in job ${job.id}: ${error?.message}`);
+            if (targetIds.length > 0) {
+                await this.discoveryUrlService.update({ id: In(targetIds) } as any, { status: DiscoveryUrlStatus.FAILED });
+            }

             throw error;
         }
     }
```

---

## Section 5. Test Cases & Verification

- **Automated Verification**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` (PASS - Exit code 0, không có lỗi type).
  - `[x]` `npm run build` (PASS - Nest build & tsc thành công không có lỗi).
- **Manual / Integration Verification**:
  - `[x]` Ingestion đơn lẻ: Tra cứu `Item` được gộp thành 1 query `findListByFilter` với điều kiện `OR` (`WHERE code = :code OR name = :name`) và xử lý mapping in-memory.
  - `[x]` Chunked Ingestion: Hàm `ingestDiscoveredUrlsChunk` gom nhóm bulk queries cho toàn bộ danh sách URL, deduplicate new items trong memory.
  - `[x]` Queue Dispatcher: `batchIngest` phân chia tập URL thành các chunks 50 items/job, worker hỗ trợ cả payload batch và single URL.
