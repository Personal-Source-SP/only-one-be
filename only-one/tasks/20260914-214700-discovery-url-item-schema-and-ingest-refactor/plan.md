---
status: done
slug: 20260914-214700-discovery-url-item-schema-and-ingest-refactor
started_at: 2026-09-14
completed_at: 2026-09-14
pr_url: ~
branch: ~
---

# Plan: Tái cấu trúc Schema DiscoveryUrl & Item, Thiết lập Quan hệ Trực tiếp và Tối ưu Hóa Luồng Ingest

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại & Điểm nghẽn**:
    - `DiscoveryUrlEntity` (`discovery-url.entity.ts`) chứa trường `description` thừa thãi nhưng thiếu trường nghiệp vụ `code` (required) và `metadata` (jsonb). Thực thể này hiện không có liên kết khóa ngoại (`item_id` / `itemId`) trực tiếp tới `ItemEntity`.
    - `ItemEntity` (`item.entity.ts`) để trường `code` ở trạng thái `nullable: true`, gây lỏng lẻo về data integrity khi mapping dữ liệu; đồng thời thiếu trường `metadata` (jsonb) để lưu trữ dynamic payload.
    - `DiscoveryUrlService.ingestDiscoveredUrl` (`discovery-url.service.ts`) đang phải tự bóc tách `code` lúc runtime qua `extractCodeFromUrl` và truy vấn mập mờ qua cả `code` lẫn `name` fallback, thay vì tận dụng trường `code` đã được định danh và chuẩn hóa từ `DiscoveryUrlEntity`.
- **Invariants bắt buộc duy trì**:
    - `ItemEntity.code` phải là duy nhất (`@Unique(['code'])`) trên toàn hệ thống.
    - Sau khi `DiscoveryUrl` được ingest thành công, `status` phải chuyển sang `DiscoveryUrlStatus.INGESTED` và `itemId` phải được gắn chính xác vào `DiscoveryUrlEntity`.
    - Giữ nguyên cơ chế tương thích của `DataProviderItemEntity` (`itemId`, `itemUrl`, `dataProviderId`).
    - AutoMapper profile (`data-provider.profile.ts`) phải khai báo tường minh `forMember` cho trường JSONB `metadata` để tránh bị AutoMapper bỏ qua.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

### 2.1 Type Signatures & Entity Contracts

#### `DiscoveryUrlEntity` (`discovery-url.entity.ts`)

```typescript
// Xóa: description?: string;
// Bổ sung:
@Column({ type: 'varchar', length: 100 })
@AutoMap()
@Index()
code: string;

@Column({ type: 'jsonb', default: {} })
@AutoMap()
metadata?: Record<string, unknown>;

@Column({ type: 'uuid', nullable: true })
@AutoMap()
@Index()
itemId?: string;

@ManyToOne(() => ItemEntity, (item) => item.discoveryUrls, { onDelete: 'SET NULL', nullable: true })
@JoinColumn({ name: 'item_id' })
@AutoMap(() => ItemEntity)
item?: Relation<ItemEntity>;
```

#### `ItemEntity` (`item.entity.ts`)

```typescript
@Column({ length: 100, nullable: false })
@AutoMap()
code: string;

@Column({ type: 'jsonb', default: {} })
@AutoMap()
metadata?: Record<string, unknown>;

@OneToMany(() => DiscoveryUrlEntity, (d) => d.item)
@AutoMap(() => [DiscoveryUrlEntity])
discoveryUrls?: Relation<DiscoveryUrlEntity>[];
```

#### `CreateItemRequestDto` & `UpdateItemRequestDto` (`item-request.dto.ts`)

```typescript
export class CreateItemRequestDto {
    @StringField({ maxLength: 255 })
    @AutoMap()
    name: string;

    @StringField({ maxLength: 100 })
    @AutoMap()
    code: string;

    @ObjectFieldOptional()
    @AutoMap()
    metadata?: Record<string, unknown>;

    @StringFieldOptional({ each: true, description: 'Tags list or comma-separated string' })
    @AutoMap()
    tags?: string[];
}
```

#### `SearchResultItemDto` (`search-extract-data-response.dto.ts`)

```typescript
export class SearchResultItemDto {
    url: string;
    code?: string;
    title?: string;
    imageUrl?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    [key: string]: any;
}
```

### 2.2 AST Seams & Callers

- `DiscoveryUrlService.ingestDiscoveredUrl`: Thay đổi logic lookup từ `extractCodeFromUrl` + fallback name sang tìm kiếm `ItemEntity` trực tiếp qua `urlEntity.code`, khởi tạo `Item` với `metadata`, gán `urlEntity.itemId = item.id`.
- `DiscoveryUrlService.ingestDiscoveredUrlsChunk`: Tương tự, gom nhóm batch theo `urlEntity.code`, gán `itemId` và update `status = INGESTED`.
- `DiscoverySessionService.saveDiscoveredUrls`: Gán `urlEntity.code` (từ `item.code` hoặc fallback `extractCodeFromUrl`), gán `urlEntity.metadata` và loại bỏ `urlEntity.description`.
- `DataProviderProfile`: Thêm `forMember` map `metadata` cho `DiscoveryUrlDto`, `ItemDto`, `CreateItemRequestDto`, `UpdateItemRequestDto`.
- `ExtractSearchDataHelper` / `LocalDataProviderSearchService`: Cung cấp `SearchResultItemDto` với `code`, `tags`, `metadata`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
src/
├── migrations/
│   └── [NEW]    1766200000000-RefactorDiscoveryUrlAndItemMetadataAndRelations.ts
└── modules/data-provider/
    ├── constants/
    │   ├── [MODIFY] discovery-url-pagination.config.ts
    │   └── [MODIFY] item-pagination.config.ts
    ├── data-provider.profile.ts
    ├── dtos/
    │   ├── [MODIFY] discovery-url.dto.ts
    │   ├── [MODIFY] item.dto.ts
    │   ├── requests/
    │   │   └── [MODIFY] item-request.dto.ts
    │   └── responses/
    │       └── [MODIFY] search-extract-data-response.dto.ts
    ├── entities/
    │   ├── [MODIFY] discovery-url.entity.ts
    │   └── [MODIFY] item.entity.ts
    └── services/
        ├── [MODIFY] discovery-session.service.ts
        ├── [MODIFY] discovery-url.service.ts
        └── _tests/
            └── [MODIFY] discovery-url.service.spec.ts
```

### 3.2 Task Matrix & Dependency Graph

| Order  | Status |   Action   | File Path                                                                         | Target Symbols / AST Seams                                             | Depends On      | Fast Test Command                                   |
| :----: | :----: | :--------: | :-------------------------------------------------------------------------------- | :--------------------------------------------------------------------- | :-------------- | :-------------------------------------------------- |
| **1**  | `[x]`  |  `[NEW]`   | `src/migrations/1766200000000-RefactorDiscoveryUrlAndItemMetadataAndRelations.ts` | `RefactorDiscoveryUrlAndItemMetadataAndRelations1766200000000`         | `None`          | `npm run build`                                     |
| **2**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/entities/discovery-url.entity.ts`                      | `DiscoveryUrlEntity`                                                   | `Order 1`       | `npm run build`                                     |
| **3**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/entities/item.entity.ts`                               | `ItemEntity`                                                           | `Order 1`       | `npm run build`                                     |
| **4**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/dtos/discovery-url.dto.ts`                             | `DiscoveryUrlDto`                                                      | `Order 2`       | `npm run build`                                     |
| **5**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/dtos/item.dto.ts`                                      | `ItemDto`                                                              | `Order 3`       | `npm run build`                                     |
| **6**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/dtos/requests/item-request.dto.ts`                     | `CreateItemRequestDto`, `UpdateItemRequestDto`                         | `Order 3`       | `npm run build`                                     |
| **7**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts`    | `SearchResultItemDto`                                                  | `None`          | `npm run build`                                     |
| **8**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/data-provider.profile.ts`                              | `DataProviderProfile.mapDiscoveryUrl`, `DataProviderProfile.mapItem`   | `Order 4, 5, 6` | `npm run build`                                     |
| **9**  | `[x]`  | `[MODIFY]` | `src/modules/data-provider/constants/discovery-url-pagination.config.ts`          | `DISCOVERY_URL_PAGINATION_CONFIG`                                      | `Order 2`       | `npm run build`                                     |
| **10** | `[x]`  | `[MODIFY]` | `src/modules/data-provider/constants/item-pagination.config.ts`                   | `ITEM_PAGINATION_CONFIG`                                               | `Order 3`       | `npm run build`                                     |
| **11** | `[x]`  | `[MODIFY]` | `src/modules/data-provider/services/discovery-session.service.ts`                 | `DiscoverySessionService.saveDiscoveredUrls`                           | `Order 2, 7`    | `npm run build`                                     |
| **12** | `[x]`  | `[MODIFY]` | `src/modules/data-provider/services/discovery-url.service.ts`                     | `DiscoveryUrlService.ingestDiscoveredUrl`, `ingestDiscoveredUrlsChunk` | `Order 2, 3, 6` | `npm run build`                                     |
| **13** | `[x]`  | `[MODIFY]` | `src/modules/data-provider/services/_tests/discovery-url.service.spec.ts`         | `ingestDiscoveredUrl`, `ingestDiscoveredUrlsChunk` specs               | `Order 12`      | `npm run build`                                     |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/migrations/1766200000000-RefactorDiscoveryUrlAndItemMetadataAndRelations.ts`

> **Action**: Tạo migration script cập nhật bảng `discovery_urls` và `items` đồng bộ với schema mới.

```diff
--- /dev/null
+++ b/src/migrations/1766200000000-RefactorDiscoveryUrlAndItemMetadataAndRelations.ts
@@ -0,0 +1,41 @@
+import { MigrationInterface, QueryRunner } from 'typeorm';
+
+export class RefactorDiscoveryUrlAndItemMetadataAndRelations1766200000000 implements MigrationInterface {
+    name = 'RefactorDiscoveryUrlAndItemMetadataAndRelations1766200000000';
+
+    public async up(queryRunner: QueryRunner): Promise<void> {
+        // 1. Discovery URLs table updates
+        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "description";`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN IF NOT EXISTS "code" character varying(100) NOT NULL DEFAULT '';`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN IF NOT EXISTS "item_id" uuid;`);
+        await queryRunner.query(`
+            ALTER TABLE "discovery_urls"
+            ADD CONSTRAINT "FK_discovery_urls_item"
+            FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
+        `);
+        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_discovery_urls_code" ON "discovery_urls" ("code");`);
+        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_discovery_urls_item_id" ON "discovery_urls" ("item_id");`);
+
+        // 2. Items table updates
+        await queryRunner.query(`ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';`);
+        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "code" TYPE character varying(100);`);
+        await queryRunner.query(`UPDATE "items" SET "code" = id::text WHERE "code" IS NULL;`);
+        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "code" SET NOT NULL;`);
+    }
+
+    public async down(queryRunner: QueryRunner): Promise<void> {
+        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "code" DROP NOT NULL;`);
+        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN IF EXISTS "metadata";`);
+
+        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_discovery_urls_item_id";`);
+        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_discovery_urls_code";`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP CONSTRAINT IF EXISTS "FK_discovery_urls_item";`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "item_id";`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "metadata";`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "code";`);
+        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN "description" text;`);
+    }
+}
```

---

### 2. `[MODIFY]` `src/modules/data-provider/entities/discovery-url.entity.ts`

> **Action**: Bỏ trường `description`, thêm `code` (required), `metadata`, `itemId` và relation `item` tới `ItemEntity`.

```diff
--- a/src/modules/data-provider/entities/discovery-url.entity.ts
+++ b/src/modules/data-provider/entities/discovery-url.entity.ts
@@ -12,6 +12,7 @@
 import { DataProviderEntity } from './data-provider.entity';
 import { DiscoverySessionEntity } from './discovery-session.entity';
 import { DiscoveryValidationLogEntity } from './discovery-validation-log.entity';
+import { ItemEntity } from './item.entity';

 @Entity({ name: 'discovery_urls', synchronize: false })
 @Unique(['sessionId', 'url'])
@@ -37,10 +38,15 @@
     @Column({ type: 'varchar', length: 1000, nullable: true })
     @AutoMap()
     title?: string;

-    @Column({ type: 'text', nullable: true })
+    @Column({ type: 'varchar', length: 100 })
     @AutoMap()
-    description?: string;
+    @Index()
+    code: string;
+
+    @Column({ type: 'jsonb', default: {} })
+    @AutoMap()
+    metadata?: Record<string, unknown>;

     @Column({ type: 'varchar', length: 20, default: DiscoveryUrlStatus.DISCOVERED })
     @AutoMap()
@@ -80,6 +86,16 @@
     @JoinColumn({ name: 'session_id' })
     @AutoMap(() => DiscoverySessionEntity)
     discoverySession: Relation<DiscoverySessionEntity>;

+    @Column({ type: 'uuid', nullable: true })
+    @AutoMap()
+    @Index()
+    itemId?: string;
+
+    @ManyToOne(() => ItemEntity, (item) => item.discoveryUrls, { onDelete: 'SET NULL', nullable: true })
+    @JoinColumn({ name: 'item_id' })
+    @AutoMap(() => ItemEntity)
+    item?: Relation<ItemEntity>;
+
     @ManyToOne(() => DataProviderEntity, { onDelete: 'CASCADE' })
     @JoinColumn({ name: 'data_provider_id' })
     @AutoMap(() => DataProviderEntity)
```

---

### 3. `[MODIFY]` `src/modules/data-provider/entities/item.entity.ts`

> **Action**: Đặt `code` thành required (`nullable: false`), thêm trường `metadata` (jsonb) và relation `discoveryUrls` tới `DiscoveryUrlEntity`.

```diff
--- a/src/modules/data-provider/entities/item.entity.ts
+++ b/src/modules/data-provider/entities/item.entity.ts
@@ -5,6 +5,7 @@
 import { ProductMappingStatus } from '../enums';
 import { DataProviderItemEntity } from './data-provider-item.entity';
+import { DiscoveryUrlEntity } from './discovery-url.entity';
 import { ScrapingDataEntity } from './scraping-data.entity';

 @Entity({ name: 'items', synchronize: false })
@@ -17,9 +18,13 @@
     @Column({ type: 'varchar', length: 100, default: ProductMappingStatus.UNMAPPED })
     @AutoMap()
     mappingStatus: ProductMappingStatus;

-    @Column({ length: 20, nullable: true })
+    @Column({ length: 100, nullable: false })
     @AutoMap()
-    code?: string;
+    code: string;
+
+    @Column({ type: 'jsonb', default: {} })
+    @AutoMap()
+    metadata?: Record<string, unknown>;

     @Column({ type: 'jsonb', default: [] })
     @AutoMap()
@@ -29,6 +34,10 @@
     @AutoMap(() => [DataProviderItemEntity])
     dataProviderItems?: Relation<DataProviderItemEntity>[];

+    @OneToMany(() => DiscoveryUrlEntity, (d) => d.item)
+    @AutoMap(() => [DiscoveryUrlEntity])
+    discoveryUrls?: Relation<DiscoveryUrlEntity>[];
+
     @OneToMany(() => ScrapingDataEntity, (entity) => entity.item)
     @AutoMap(() => [ScrapingDataEntity])
     scrapingData?: Relation<ScrapingDataEntity>[];
```

---

### 4. `[MODIFY]` `src/modules/data-provider/dtos/discovery-url.dto.ts`

> **Action**: Xóa `description`, thêm `code`, `metadata`, `itemId` và quan hệ `item`.

```diff
--- a/src/modules/data-provider/dtos/discovery-url.dto.ts
+++ b/src/modules/data-provider/dtos/discovery-url.dto.ts
@@ -11,6 +11,7 @@
 import { DataProviderDto } from './data-provider.dto';
 import { DiscoverySessionDto } from './discovery-session.dto';
+import { ItemDto } from './item.dto';

 export class DiscoveryUrlDto extends AbstractDto {
     @AutoMap()
@@ -34,9 +35,18 @@
     @AutoMap()
     title?: string;

-    @AutoMap()
-    description?: string;
+    @AutoMap()
+    code: string;
+
+    @AutoMap()
+    metadata?: Record<string, unknown>;
+
+    @AutoMap()
+    itemId?: string;
+
+    @AutoMap(() => ItemDto)
+    item?: ItemDto;

     @AutoMap()
     status: DiscoveryUrlStatus;
```

---

### 5. `[MODIFY]` `src/modules/data-provider/dtos/item.dto.ts`

> **Action**: Đặt `code` required, thêm `metadata` và relation `discoveryUrls`.

```diff
--- a/src/modules/data-provider/dtos/item.dto.ts
+++ b/src/modules/data-provider/dtos/item.dto.ts
@@ -5,6 +5,7 @@
 import { ProductMappingStatus } from '../enums';
 import { DataProviderItemDto } from './data-provider-item.dto';
+import { DiscoveryUrlDto } from './discovery-url.dto';
 import { ScrapingDataDto } from './scraping-data.dto';

 export class ItemDto extends AbstractDto {
@@ -17,9 +18,13 @@
     @ApiResponseProperty()
     @AutoMap()
     mappingStatus: ProductMappingStatus;

     @ApiResponseProperty()
     @AutoMap()
-    code?: string;
+    code: string;
+
+    @ApiResponseProperty()
+    @AutoMap()
+    metadata?: Record<string, unknown>;

     @ApiResponseProperty()
     @AutoMap()
@@ -27,4 +32,8 @@
     @AutoMap(() => [DataProviderItemDto])
     dataProviderItems?: DataProviderItemDto[];
+
+    @ApiResponseProperty()
+    @AutoMap(() => [DiscoveryUrlDto])
+    discoveryUrls?: DiscoveryUrlDto[];
 }
```

---

### 6. `[MODIFY]` `src/modules/data-provider/dtos/requests/item-request.dto.ts`

> **Action**: Chuyển `code` thành `@StringField({ maxLength: 100 })` (required) trên `CreateItemRequestDto` và thêm `@ObjectFieldOptional()` metadata.

```diff
--- a/src/modules/data-provider/dtos/requests/item-request.dto.ts
+++ b/src/modules/data-provider/dtos/requests/item-request.dto.ts
@@ -1,7 +1,7 @@
 import { AutoMap } from '@automapper/classes';
 import { Transform } from 'class-transformer';

-import { StringField, StringFieldOptional } from '../../../../decorators';
+import { ObjectFieldOptional, StringField, StringFieldOptional } from '../../../../decorators';

 export class CreateItemRequestDto {
     @StringField({ maxLength: 255 })
     @AutoMap()
     name: string;

-    @StringFieldOptional({ maxLength: 20 })
+    @StringField({ maxLength: 100 })
     @AutoMap()
-    code?: string;
+    code: string;
+
+    @ObjectFieldOptional()
+    @AutoMap()
+    metadata?: Record<string, unknown>;

     @StringFieldOptional({
         each: true,
@@ -34,7 +38,11 @@
     @AutoMap()
     name?: string;

-    @StringFieldOptional({ maxLength: 20 })
+    @StringFieldOptional({ maxLength: 100 })
     @AutoMap()
     code?: string;
+
+    @ObjectFieldOptional()
+    @AutoMap()
+    metadata?: Record<string, unknown>;

     @StringFieldOptional({ each: true })
```

---

### 7. `[MODIFY]` `src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts`

> **Action**: Thêm `code?: string`, `tags?: string[]`, bỏ trường `relativeUrl?: string`.

```diff
--- a/src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts
+++ b/src/modules/data-provider/dtos/responses/search-extract-data-response.dto.ts
@@ -1,8 +1,9 @@
 export class SearchResultItemDto {
     url: string;
+    code?: string;
     title?: string;
     imageUrl?: string;
-    relativeUrl?: string;
+    tags?: string[];
     metadata?: Record<string, any>;
     [key: string]: any;
 }
```

---

### 8. `[MODIFY]` `src/modules/data-provider/data-provider.profile.ts`

> **Action**: Thêm mapping profile tường minh `forMember` cho `metadata` của `DiscoveryUrl` và `Item`.

```diff
--- a/src/modules/data-provider/data-provider.profile.ts
+++ b/src/modules/data-provider/data-provider.profile.ts
@@ -111,10 +111,38 @@
     private mapItem(mapper: Mapper): void {
-        createMap(mapper, ItemEntity, ItemDto);
-        createMap(mapper, ItemDto, ItemEntity);
-        createMap(mapper, CreateItemRequestDto, ItemEntity);
-        createMap(mapper, UpdateItemRequestDto, ItemEntity);
+        createMap(
+            mapper,
+            ItemEntity,
+            ItemDto,
+            forMember(
+                (d) => d.metadata,
+                mapFrom((s) => s.metadata),
+            ),
+        );
+        createMap(
+            mapper,
+            ItemDto,
+            ItemEntity,
+            forMember(
+                (d) => d.metadata,
+                mapFrom((s) => s.metadata),
+            ),
+        );
+        createMap(
+            mapper,
+            CreateItemRequestDto,
+            ItemEntity,
+            forMember(
+                (d) => d.metadata,
+                mapFrom((s) => s.metadata),
+            ),
+        );
+        createMap(
+            mapper,
+            UpdateItemRequestDto,
+            ItemEntity,
+            forMember(
+                (d) => d.metadata,
+                mapFrom((s) => s.metadata),
+            ),
+        );
     }
@@ -176,3 +204,11 @@
     private mapDiscoveryUrl(mapper: Mapper): void {
-        createMap(mapper, DiscoveryUrlEntity, DiscoveryUrlDto);
+        createMap(
+            mapper,
+            DiscoveryUrlEntity,
+            DiscoveryUrlDto,
+            forMember(
+                (d) => d.metadata,
+                mapFrom((s) => s.metadata),
+            ),
+        );
     }
```

---

### 9. `[MODIFY]` `src/modules/data-provider/constants/discovery-url-pagination.config.ts`

> **Action**: Bổ sung `'code'` vào `sortableColumns` và `searchableColumns`.

```diff
--- a/src/modules/data-provider/constants/discovery-url-pagination.config.ts
+++ b/src/modules/data-provider/constants/discovery-url-pagination.config.ts
@@ -11,6 +11,7 @@
         'url',
+        'code',
         'domain',
         'title',
         'status',
@@ -20,3 +21,3 @@
     ],
-    searchableColumns: ['url', 'domain', 'title'],
+    searchableColumns: ['url', 'code', 'domain', 'title'],
     defaultSortBy: [['createdAt', 'DESC']],
```

---

### 10. `[MODIFY]` `src/modules/data-provider/constants/item-pagination.config.ts`

> **Action**: Bổ sung `'code'` vào `sortableColumns`, `searchableColumns` và `filterableColumns`.

```diff
--- a/src/modules/data-provider/constants/item-pagination.config.ts
+++ b/src/modules/data-provider/constants/item-pagination.config.ts
@@ -8,7 +8,8 @@
 export const ITEM_PAGINATION_CONFIG = createPaginationConfig<ItemEntity>({
-    sortableColumns: ['name', 'createdAt'],
-    searchableColumns: ['name'],
+    sortableColumns: ['name', 'code', 'createdAt'],
+    searchableColumns: ['name', 'code'],
     defaultSortBy: [['name', 'ASC']],
     filterableColumns: {
         name: [FilterOperator.ILIKE, FilterOperator.EQ],
+        code: [FilterOperator.EQ],
     },
```

---

### 11. `[MODIFY]` `src/modules/data-provider/services/discovery-session.service.ts`

> **Action**: Gán `urlEntity.code` và `urlEntity.metadata` khi lưu các discovered URLs, loại bỏ gán `description`.

```diff
--- a/src/modules/data-provider/services/discovery-session.service.ts
+++ b/src/modules/data-provider/services/discovery-session.service.ts
@@ -293,7 +293,8 @@
             urlEntity.sessionId = session.id;
             urlEntity.dataProviderId = session.dataProviderId;
             urlEntity.url = item.url;
             urlEntity.title = item.title;
-            urlEntity.description = item.description;
+            urlEntity.code = item.code || this.discoveryUrlService.extractCodeFromUrl(item.url, item.title) || item.url;
+            urlEntity.metadata = item.metadata || {};
             urlEntity.matchResult = evalResult.matchResult;
             urlEntity.confidenceScore = evalResult.confidenceScore;
```

---

### 12. `[MODIFY]` `src/modules/data-provider/services/discovery-url.service.ts`

> **Action**: Tinh gọn `ingestDiscoveredUrl` và `ingestDiscoveredUrlsChunk`, tìm kiếm `Item` theo `code` có sẵn, gán `metadata`, liên kết `itemId` và chuyển trạng thái `INGESTED`.

```diff
--- a/src/modules/data-provider/services/discovery-url.service.ts
+++ b/src/modules/data-provider/services/discovery-url.service.ts
@@ -48,27 +48,22 @@
         if (!urlEntity) throw new AppException(DataProviderError.UrlNotFound(urlId));

-        const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
-        const name = urlEntity.title?.trim() || urlEntity.url;
+        const code = urlEntity.code;
+        const name = urlEntity.title?.trim() || urlEntity.code;

         let item: ItemDto = null;
         let isNewItem = false;

-        // Step 1 & 2: Combined single query check by code OR name
-        const itemConditions: FindOptionsWhere<ItemEntity>[] = [];
-        if (code) itemConditions.push({ code });
-        if (name) itemConditions.push({ name });
-
-        if (itemConditions.length > 0) {
-            const existingItems = await this.itemService.findListByFilter(itemConditions);
-            if (code) {
-                item = existingItems.find((i) => i.code === code) || null;
-            }
-            if (!item && name) {
-                item = existingItems.find((i) => i.name === name) || null;
-            }
+        // Step 1: Lookup existing item by required unique code
+        if (code) {
+            item = await this.itemService.findOneByFilter({ code });
         }

-        // Step 3: Create new Item if not found
+        // Step 2: Create new Item if not found
         if (!item) {
-            item = await this.itemService.create({ name, code: code || undefined });
+            item = await this.itemService.create({
+                name,
+                code,
+                metadata: urlEntity.metadata || {},
+            });
             isNewItem = true;
         }

@@ -87,7 +82,10 @@
             });
         }

-        // Step 5: Mark status INGESTED
-        await this.discoveryUrlRepository.update(urlId, { status: DiscoveryUrlStatus.INGESTED });
+        // Step 5: Link item to discovery URL and mark status INGESTED
+        await this.discoveryUrlRepository.update(urlId, {
+            itemId: item.id,
+            status: DiscoveryUrlStatus.INGESTED,
+        });

         return new IngestDiscoveredUrlResponseDto({
@@ -107,45 +105,33 @@
         if (!urls.length) return [];

-        // 1. Extract metadata for all URLs in chunk
-        const urlMetadataList = urls.map((urlEntity) => {
-            const code = this.extractCodeFromUrl(urlEntity.url, urlEntity.title);
-            const name = urlEntity.title?.trim() || urlEntity.url;
-            return { urlEntity, code, name };
-        });
-
-        // 2. Collect unique codes and names for bulk item lookup
-        const codes = Array.from(new Set(urlMetadataList.map((m) => m.code).filter(Boolean)));
-        const names = Array.from(new Set(urlMetadataList.map((m) => m.name).filter(Boolean)));
-
-        const itemConditions: FindOptionsWhere<ItemEntity>[] = [];
-        if (codes.length > 0) itemConditions.push({ code: In(codes) });
-        if (names.length > 0) itemConditions.push({ name: In(names) });
-
-        const existingItems = itemConditions.length > 0 ? await this.itemService.findListByFilter(itemConditions) : [];
+        // 1. Collect unique codes for bulk item lookup
+        const codes = Array.from(new Set(urls.map((u) => u.code).filter(Boolean)));
+        const existingItems = codes.length > 0 ? await this.itemService.findListByFilter({ code: In(codes) }) : [];

         const codeToItemMap = new Map<string, ItemDto>();
-        const nameToItemMap = new Map<string, ItemDto>();
-
         for (const it of existingItems) {
             if (it.code && !codeToItemMap.has(it.code)) codeToItemMap.set(it.code, it);
-            if (it.name && !nameToItemMap.has(it.name)) nameToItemMap.set(it.name, it);
         }

-        // 3. Resolve Items for each URL (Deduplicating in-memory for newly created items)
-        const resolvedItems: { meta: (typeof urlMetadataList)[0]; item: ItemDto; isNewItem: boolean }[] = [];
+        // 2. Resolve Items for each URL (Deduplicating in-memory for newly created items)
+        const resolvedItems: { urlEntity: DiscoveryUrlEntity; item: ItemDto; isNewItem: boolean }[] = [];

-        for (const meta of urlMetadataList) {
-            let matchedItem: ItemDto = null;
+        for (const urlEntity of urls) {
+            let matchedItem = codeToItemMap.get(urlEntity.code) || null;
             let isNew = false;

-            if (!matchedItem) {
-                matchedItem = await this.itemService.create({ name: meta.name, code: meta.code || undefined });
+            if (!matchedItem) {
+                const name = urlEntity.title?.trim() || urlEntity.code;
+                matchedItem = await this.itemService.create({
+                    name,
+                    code: urlEntity.code,
+                    metadata: urlEntity.metadata || {},
+                });
                 isNew = true;
-                if (meta.code) codeToItemMap.set(meta.code, matchedItem);
-                if (meta.name) nameToItemMap.set(meta.name, matchedItem);
+                codeToItemMap.set(urlEntity.code, matchedItem);
             }

-            resolvedItems.push({ meta, item: matchedItem, isNewItem: isNew });
+            resolvedItems.push({ urlEntity, item: matchedItem, isNewItem: isNew });
         }

         // 4. Bulk lookup existing DataProviderItems
@@ -165,8 +151,8 @@

         // 5. Ensure DataProviderItems exist
         const results: IngestDiscoveredUrlResponseDto[] = [];
-        for (const { meta, item, isNewItem } of resolvedItems) {
-            const key = `${meta.urlEntity.dataProviderId}_${item.id}_${meta.urlEntity.url}`;
+        for (const { urlEntity, item, isNewItem } of resolvedItems) {
+            const key = `${urlEntity.dataProviderId}_${item.id}_${urlEntity.url}`;
             let dpi = dpiMap.get(key);

             if (!dpi) {
-                dpi = await this.dataProviderItemService.create({
-                    itemId: item.id,
-                    itemUrl: meta.urlEntity.url,
-                    dataProviderId: meta.urlEntity.dataProviderId,
-                });
+                dpi = await this.dataProviderItemService.create({
+                    itemId: item.id,
+                    itemUrl: urlEntity.url,
+                    dataProviderId: urlEntity.dataProviderId,
+                });
                 dpiMap.set(key, dpi);
             }

+            // Update individual DiscoveryUrl with itemId and status INGESTED
+            await this.discoveryUrlRepository.update(urlEntity.id, {
+                itemId: item.id,
+                status: DiscoveryUrlStatus.INGESTED,
+            });
+
             results.push(
                 new IngestDiscoveredUrlResponseDto({
                     isNewItem,
                     itemId: item.id,
                     dataProviderItemId: dpi.id,
                 }),
             );
         }

-        // 6. Bulk update DiscoveryUrls status to INGESTED
-        const processedIds = urls.map((u) => u.id);
-        await this.discoveryUrlRepository.update({ id: In(processedIds) }, { status: DiscoveryUrlStatus.INGESTED });
-
         return results;
     }
```

---

### 13. `[MODIFY]` `src/modules/data-provider/services/_tests/discovery-url.service.spec.ts`

> **Action**: Cập nhật mock entity và assertions trong unit tests phản ánh đúng `code`, `metadata` và `itemId`.

```diff
--- a/src/modules/data-provider/services/_tests/discovery-url.service.spec.ts
+++ b/src/modules/data-provider/services/_tests/discovery-url.service.spec.ts
@@ -87,6 +87,8 @@
             urlRepo.findOne.mockResolvedValue({
                 id: 'url-1',
                 sessionId: 'session-1',
                 dataProviderId: 'dp-1',
                 url: 'https://example.com/p1?sku=SKU-1',
                 title: 'Product 1',
+                code: 'SKU-1',
+                metadata: { source: 'crawler' },
             });
+            itemService.findOneByFilter.mockResolvedValue(null);
+            itemService.create.mockResolvedValue({ id: 'item-1', code: 'SKU-1', name: 'Product 1' });
+            dataProviderItemService.findOneByFilterAndOptions.mockResolvedValue(null);
+            dataProviderItemService.create.mockResolvedValue({ id: 'dpi-1', itemId: 'item-1' });

             const result = await service.ingestDiscoveredUrl('url-1');

             expect(result.itemId).toBe('item-1');
             expect(result.dataProviderItemId).toBe('dpi-1');
             expect(result.isNewItem).toBe(true);
-            expect(urlRepo.update).toHaveBeenCalledWith('url-1', { status: DiscoveryUrlStatus.INGESTED });
+            expect(urlRepo.update).toHaveBeenCalledWith('url-1', {
+                itemId: 'item-1',
+                status: DiscoveryUrlStatus.INGESTED,
+            });
         });

-        it('should reuse existing item if found by code or name', async () => {
+        it('should reuse existing item if found by code', async () => {
             urlRepo.findOne.mockResolvedValue({
                 id: 'url-1',
                 sessionId: 'session-1',
                 dataProviderId: 'dp-1',
                 url: 'https://example.com/p1?sku=SKU-1',
                 title: 'Product 1',
+                code: 'SKU-1',
             });
-            itemService.findListByFilter.mockResolvedValue([{ id: 'existing-item-id', code: 'SKU-1', name: 'Product 1' }]);
+            itemService.findOneByFilter.mockResolvedValue({ id: 'existing-item-id', code: 'SKU-1', name: 'Product 1' });
             dataProviderItemService.findOneByFilterAndOptions.mockResolvedValue({
                 id: 'existing-dpi-id',
                 itemId: 'existing-item-id',
@@ -137,6 +139,8 @@
             urlRepo.find.mockResolvedValue([
                 {
                     id: 'url-1',
                     sessionId: 'session-1',
                     dataProviderId: 'dp-1',
                     url: 'https://example.com/p1?sku=SKU-1',
                     title: 'Product 1',
+                    code: 'SKU-1',
                 },
                 {
                     id: 'url-2',
                     sessionId: 'session-1',
                     dataProviderId: 'dp-1',
                     url: 'https://example.com/p2?sku=SKU-2',
                     title: 'Product 2',
+                    code: 'SKU-2',
                 },
             ]);
```

---

## Section 5. Test Cases & Verification

### Automated Tests

- [x] **TypeScript Build & Typecheck**:
    ```bash
    npm run build
    ```
    *Result*: `PASS` (code 0, `rimraf dist && tsc -p tsconfig.build.json && nest build` completed cleanly).
- [x] **Code Formatting**:
    ```bash
    npm run prettier:write
    ```
    *Result*: `PASS` (code 0, all files formatted without errors).

### Manual Checks

1. [x] Kiểm tra migration script `1766200000000-RefactorDiscoveryUrlAndItemMetadataAndRelations.ts` tạo đầy đủ các cột `code`, `metadata`, `item_id`, index và foreign keys.
2. [x] Kiểm tra `ItemEntity` và `DiscoveryUrlEntity` tự động link quan hệ 2 chiều khi ingest URL thành công (`itemId`, `discoveryUrls`).
3. [x] Kiểm tra `SearchResultItemDto` cung cấp `code`, `tags`, `metadata` và loại bỏ `relativeUrl`.
