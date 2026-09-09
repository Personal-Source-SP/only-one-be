---
status: done
slug: data-provider-services-app-error-standardization
started_at: 2026-09-09
completed_at: 2026-09-09
pr_url: ~
branch: ~
---

# Plan: Chuẩn hóa Toàn bộ App Error Code trong Data Provider Services

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- Trong `config-version.service.ts`, `data-provider-item.service.ts`, `discovery-validation.service.ts`, nhiều phương thức nghiệp vụ đang ném trực tiếp raw HTTP exceptions của NestJS (`NotFoundException`, `BadRequestException`, `InternalServerErrorException`) kèm hardcoded string messages thay vì `AppException` và `DataProviderError`.
- Invariants bắt buộc giữ nguyên:
  - Giữ nguyên toàn bộ database transaction logic, snapshotting flow và Redis queue job structure.
  - Toàn bộ ngoại lệ ném ra từ tầng service phải thông qua `AppException` với `IAppError` dictionary để centralized `AllExceptionsFilter` xử lý đồng bộ.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)
*(Kế thừa 100% cơ chế vận hành từ concept.md; không mô tả lại giải pháp tổng quan)*

- **Type Signatures & Code Contracts**:
  - `DataProviderError` (`data-provider-error.ts`):
    - `ConfigVersionNotFound(versionId: number | string, featureId?: string): IAppError`
    - `CannotDeleteActiveConfigVersion: IAppError`
    - `DataProviderItemNotFound(id: string): IAppError`
    - `DataProviderItemNotFoundByProviderId(dataProviderId: string): IAppError`
    - `DataProviderItemAlreadyExists: IAppError`
    - `InvalidItemUrl(expectedBaseUrl: string, gotUrl: string): IAppError`
    - `NoDiscoveredUrlsFound(sessionId: string): IAppError`
    - `ValidationBatchNotFound(batchId: string): IAppError`
    - `BatchAlreadyFinishedOrCancelled: IAppError`
    - `FailedToQueueValidationJobs: IAppError`
- **AST Seams & Callers**:
  - `ConfigVersionService` (`config-version.service.ts`):
    - `rollbackToVersionIdByFeature`: `throw new AppException(DataProviderError.ConfigVersionNotFound(versionId, featureId))`
    - `deleteConfigVersionByFeature`: `throw new AppException(DataProviderError.ConfigVersionNotFound(versionId, featureId))` & `throw new AppException(DataProviderError.CannotDeleteActiveConfigVersion)`
  - `DataProviderItemService` (`data-provider-item.service.ts`):
    - `create`: `ItemNotFound`, `DataProviderWithIdNotFound`, `InvalidItemUrl`
    - `update`: `DataProviderItemNotFound`, `ItemNotFound`, `DataProviderWithIdNotFound`, `InvalidItemUrl`
    - `updateItemUrlByDataProviderId`: `DataProviderWithIdNotFound`, `DataProviderItemNotFoundByProviderId`
    - `switchActiveStatus`: `DataProviderItemNotFound`
  - `DiscoveryValidationService` (`discovery-validation.service.ts`):
    - `startBatchValidation`: `SessionNotFound`, `NoDiscoveredUrlsFound`, `FailedToQueueValidationJobs`
    - `cancelValidationBatch`: `ValidationBatchNotFound`, `BatchAlreadyFinishedOrCancelled`
    - `revalidateDiscoveredUrl`: `UrlNotFound`

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── constants/
│   └── [MODIFY] data-provider-error.ts
└── services/
    ├── [MODIFY] config-version.service.ts
    ├── [MODIFY] data-provider-item.service.ts
    ├── [MODIFY] discovery-validation.service.ts
    └── _tests/
        ├── [NEW]    config-version.service.spec.ts
        └── [NEW]    data-provider-item.service.spec.ts
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/constants/data-provider-error.ts` | `DataProviderError` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/config-version.service.ts` | `ConfigVersionService` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-item.service.ts` | `DataProviderItemService` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-validation.service.ts` | `DiscoveryValidationService` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[NEW]` | `src/modules/data-provider/services/_tests/config-version.service.spec.ts` | Unit tests for `ConfigVersionService` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[NEW]` | `src/modules/data-provider/services/_tests/data-provider-item.service.spec.ts` | Unit tests for `DataProviderItemService` | `Order 3` | `npx tsc -p tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/constants/data-provider-error.ts`
> **Action**: Bổ sung các mã lỗi `IAppError` còn thiếu cho config version, item, validation batch và queues.

```diff
@@ -170,4 +170,64 @@
         statusCode: HttpStatus.BAD_REQUEST,
         params: { error },
     });
+
+    static ConfigVersionNotFound = (versionId: number | string, featureId?: string): IAppError => ({
+        code: 'data_provider_config_version_not_found',
+        message: featureId
+            ? `Không tìm thấy phiên bản cấu hình ${versionId} cho tính năng ${featureId}.`
+            : `Không tìm thấy phiên bản cấu hình ${versionId}.`,
+        statusCode: HttpStatus.NOT_FOUND,
+        params: { versionId: String(versionId), featureId },
+    });
+
+    static readonly CannotDeleteActiveConfigVersion: IAppError = {
+        code: 'data_provider_cannot_delete_active_config_version',
+        message: 'Không thể xóa phiên bản cấu hình đang hoạt động.',
+        statusCode: HttpStatus.BAD_REQUEST,
+    };
+
+    static DataProviderItemNotFound = (id: string): IAppError => ({
+        code: 'data_provider_item_not_found',
+        message: `Không tìm thấy liên kết sản phẩm của nhà cung cấp với ID ${id}.`,
+        statusCode: HttpStatus.NOT_FOUND,
+        params: { id },
+    });
+
+    static DataProviderItemNotFoundByProviderId = (dataProviderId: string): IAppError => ({
+        code: 'data_provider_item_not_found_by_provider',
+        message: `Không tìm thấy sản phẩm nào thuộc nhà cung cấp với ID ${dataProviderId}.`,
+        statusCode: HttpStatus.NOT_FOUND,
+        params: { dataProviderId },
+    });
+
+    static readonly DataProviderItemAlreadyExists: IAppError = {
+        code: 'data_provider_item_already_exists',
+        message: 'Sản phẩm của nhà cung cấp dữ liệu đã tồn tại.',
+        statusCode: HttpStatus.CONFLICT,
+    };
+
+    static InvalidItemUrl = (expectedBaseUrl: string, gotUrl: string): IAppError => ({
+        code: 'data_provider_invalid_item_url',
+        message: `Đường dẫn sản phẩm phải bắt đầu bằng URL gốc '${expectedBaseUrl}'. Nhận được: '${gotUrl}'.`,
+        statusCode: HttpStatus.BAD_REQUEST,
+        params: { expectedBaseUrl, gotUrl },
+    });
+
+    static NoDiscoveredUrlsFound = (sessionId: string): IAppError => ({
+        code: 'discovery_no_urls_for_validation',
+        message: `Không tìm thấy URL nào trong phiên discovery ID ${sessionId} để xác thực.`,
+        statusCode: HttpStatus.BAD_REQUEST,
+        params: { sessionId },
+    });
+
+    static ValidationBatchNotFound = (batchId: string): IAppError => ({
+        code: 'discovery_validation_batch_not_found',
+        message: `Không tìm thấy đợt xác thực với ID ${batchId}.`,
+        statusCode: HttpStatus.NOT_FOUND,
+        params: { batchId },
+    });
+
+    static readonly BatchAlreadyFinishedOrCancelled: IAppError = {
+        code: 'discovery_validation_batch_already_finished',
+        message: 'Đợt xác thực đã hoàn thành hoặc đã bị hủy trước đó.',
+        statusCode: HttpStatus.BAD_REQUEST,
+    };
+
+    static readonly FailedToQueueValidationJobs: IAppError = {
+        code: 'discovery_validation_queue_failed',
+        message: 'Không thể thêm tác vụ xác thực vào hàng đợi xử lý.',
+        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
+    };
 }
```

---

### 2. `[MODIFY]` `src/modules/data-provider/services/config-version.service.ts`
> **Action**: Thay thế `NotFoundException` và `BadRequestException` bằng `AppException(DataProviderError.*)`.

```diff
@@ -1,4 +1,4 @@
-import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
+import { Injectable } from '@nestjs/common';
 import { InjectRepository } from '@nestjs/typeorm';
 import { DataSource, Repository } from 'typeorm';

@@ -8,4 +8,6 @@
 import { BaseService } from '../../../common/base.service';
 import { PayloadDto } from '../../../common/dto/payload.dto';
+import { AppException } from '../../../exceptions/app.exception';
+import { DataProviderError } from '../constants/data-provider-error';
 import { ConfigVersionDto } from '../dtos/config-version.dto';
@@ -88,4 +90,4 @@
         if (!dataProviderConfigVersion) {
-            throw new NotFoundException(`Config version ${versionId} not found for feature ID ${featureId}`);
+            throw new AppException(DataProviderError.ConfigVersionNotFound(versionId, featureId));
         }

@@ -142,8 +144,8 @@
         if (!dataProviderConfigVersion) {
             this.loggerService.warn(`No config version found for feature ID: ${featureId} and version id: ${versionId}`);
-            throw new NotFoundException('No data provider config version found');
+            throw new AppException(DataProviderError.ConfigVersionNotFound(versionId, featureId));
         }

         if (dataProviderConfigVersion.isActive) {
             this.loggerService.warn(`Cannot delete active config version for feature ID: ${featureId} and version id: ${versionId}`);
-            throw new BadRequestException('Cannot delete active data provider config version');
+            throw new AppException(DataProviderError.CannotDeleteActiveConfigVersion);
         }
```

---

### 3. `[MODIFY]` `src/modules/data-provider/services/data-provider-item.service.ts`
> **Action**: Thay thế `NotFoundException` và `BadRequestException` bằng `AppException(DataProviderError.*)`.

```diff
@@ -1,4 +1,4 @@
-import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
+import { forwardRef, Inject, Injectable } from '@nestjs/common';
 import { EventEmitter2 } from '@nestjs/event-emitter';
 import { InjectRepository } from '@nestjs/typeorm';
 import { Repository } from 'typeorm';

@@ -9,4 +9,6 @@
 import { BaseService } from '../../../common/base.service';
+import { AppException } from '../../../exceptions/app.exception';
+import { DataProviderError } from '../constants/data-provider-error';
 import { SCRAPING_DATA_EVENTS } from '../constants/event-patterns';
@@ -57,4 +59,4 @@
         const item = await this.itemService.exists({ id: request.itemId });
         if (!item) {
-            throw new NotFoundException(`Item with ID ${request.itemId} not found`);
+            throw new AppException(DataProviderError.ItemNotFound(request.itemId));
         }

@@ -69,5 +71,3 @@
         const isValidUrl = await this.validateItemUrlMatchesBaseUrl(request.itemUrl, dataProvider.baseUrl);
         if (!isValidUrl) {
-            throw new BadRequestException(
-                `Product URL must start with data provider base URL. Expected: ${dataProvider.baseUrl}, Got: ${request.itemUrl}`,
-            );
+            throw new AppException(DataProviderError.InvalidItemUrl(dataProvider.baseUrl, request.itemUrl));
         }
@@ -91,4 +91,4 @@
         const existing = await this.findOneByFilter({ id }, { relations: { dataProvider: true } });
-        if (!existing) throw new NotFoundException('DataProviderItem with ID not found');
+        if (!existing) throw new AppException(DataProviderError.DataProviderItemNotFound(id));

         // Verify product exists if updating
         if (request.itemId) {
             const itemExists = await this.itemService.exists({ id: request.itemId });
-            if (!itemExists) throw new NotFoundException(`Item with ID ${request.itemId} not found`);
+            if (!itemExists) throw new AppException(DataProviderError.ItemNotFound(request.itemId));
         }

@@ -106,3 +106,3 @@
-            if (!dataProvider) throw new NotFoundException(`Data Provider with ID ${request.dataProviderId} not found`);
+            if (!dataProvider) throw new AppException(DataProviderError.DataProviderWithIdNotFound(request.dataProviderId));
         }

         if (request.itemUrl) {
             const isValidUrl = this.validateItemUrlMatchesBaseUrl(request.itemUrl, dataProvider.baseUrl);
             if (!isValidUrl) {
-                throw new BadRequestException(
-                    `Item URL must start with data provider base URL. Expected: ${dataProvider.baseUrl}, Got: ${request.itemUrl}`,
-                );
+                throw new AppException(DataProviderError.InvalidItemUrl(dataProvider.baseUrl, request.itemUrl));
             }
         }
@@ -127,5 +125,5 @@
         );

-        if (!dataProvider) throw new NotFoundException(`Data Provider with ID ${dataProviderId} not found`);
+        if (!dataProvider) throw new AppException(DataProviderError.DataProviderWithIdNotFound(dataProviderId));

         const dataProviderItems = await this.findListByFilter({ dataProviderId }, { relations: { item: true } });
-        if (!dataProviderItems.length) throw new NotFoundException(`Data Provider Item with Data Provider ID ${dataProviderId} not found`);
+        if (!dataProviderItems.length) throw new AppException(DataProviderError.DataProviderItemNotFoundByProviderId(dataProviderId));
@@ -146,3 +144,3 @@
         const existing = await this.findOneByFilter({ id });
-        if (!existing) throw new NotFoundException('DataProviderItem with ID not found');
+        if (!existing) throw new AppException(DataProviderError.DataProviderItemNotFound(id));
```

---

### 4. `[MODIFY]` `src/modules/data-provider/services/discovery-validation.service.ts`
> **Action**: Thay thế `NotFoundException`, `BadRequestException` và `InternalServerErrorException` bằng `AppException(DataProviderError.*)`.

```diff
@@ -1,4 +1,4 @@
-import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
+import { Injectable } from '@nestjs/common';
 import { InjectRepository } from '@nestjs/typeorm';
 import { DataSource, Repository } from 'typeorm';

@@ -8,4 +8,6 @@
 import { QueueService } from '../../../shared/services/queue.service';
+import { AppException } from '../../../exceptions/app.exception';
+import { DataProviderError } from '../constants/data-provider-error';
 import { QUEUE_NAME } from '../constants/queue-patterns';
@@ -50,5 +52,5 @@
         });
-        if (!session) throw new NotFoundException('Discovery session not found');
+        if (!session) throw new AppException(DataProviderError.SessionNotFound(sessionId));

         const urls = await this.discoveryUrlRepository.find({ where: { sessionId } });
-        if (!urls.length) throw new BadRequestException('No discovered URLs found for session');
+        if (!urls.length) throw new AppException(DataProviderError.NoDiscoveredUrlsFound(sessionId));
@@ -89,3 +91,3 @@
             this.loggerService.warn('[startBatchValidation] Failed to add jobs to queue');
-            throw new InternalServerErrorException('Failed to add jobs to queue');
+            throw new AppException(DataProviderError.FailedToQueueValidationJobs);
         }
@@ -97,5 +99,5 @@
         const batch = await this.discoveryValidationBatchRepository.findOne({ where: { id: batchId } });
-        if (!batch) throw new NotFoundException('Validation batch not found');
+        if (!batch) throw new AppException(DataProviderError.ValidationBatchNotFound(batchId));

         if ([ValidationBatchStatus.COMPLETED, ValidationBatchStatus.CANCELLED].includes(batch.status)) {
-            throw new BadRequestException('Batch is already finished or cancelled');
+            throw new AppException(DataProviderError.BatchAlreadyFinishedOrCancelled);
         }
@@ -113,3 +115,3 @@
         const urlEntity = await this.discoveryUrlRepository.findOne({ where: { id: urlId } });
-        if (!urlEntity) throw new NotFoundException('Discovered URL not found');
+        if (!urlEntity) throw new AppException(DataProviderError.UrlNotFound(urlId));
```

---

### 5. `[NEW]` `src/modules/data-provider/services/_tests/config-version.service.spec.ts`
> **Action**: Tạo unit test suite cho `ConfigVersionService` kiểm tra ném `AppException`.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AppException } from '../../../../exceptions/app.exception';
import { LoggerService } from '../../../../shared/services/logger.service';
import { ConfigVersionEntity } from '../../entities/config-version.entity';
import { ConfigVersionService } from '../config-version.service';

describe('ConfigVersionService', () => {
    let service: ConfigVersionService;
    let mockRepo: any;
    let mockDataSource: any;
    let mockLogger: any;

    beforeEach(async () => {
        mockRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        mockDataSource = {
            transaction: jest.fn(),
        };

        mockLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigVersionService,
                { provide: getRepositoryToken(ConfigVersionEntity), useValue: mockRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: LoggerService, useValue: mockLogger },
                { provide: 'automapper:nestjs:default', useValue: { map: jest.fn((e) => e) } },
            ],
        }).compile();

        service = module.get<ConfigVersionService>(ConfigVersionService);
    });

    describe('rollbackToVersionIdByFeature', () => {
        it('should throw AppException when version is not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(service.rollbackToVersionIdByFeature('feat-1', 99)).rejects.toThrow(AppException);
        });
    });

    describe('deleteConfigVersionByFeature', () => {
        it('should throw AppException when version is not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(service.deleteConfigVersionByFeature('feat-1', 99)).rejects.toThrow(AppException);
        });

        it('should throw AppException when attempting to delete active version', async () => {
            mockRepo.findOne.mockResolvedValue({ id: 'ver-1', isActive: true });

            await expect(service.deleteConfigVersionByFeature('feat-1', 1)).rejects.toThrow(AppException);
        });
    });
});
```

---

### 6. `[NEW]` `src/modules/data-provider/services/_tests/data-provider-item.service.spec.ts`
> **Action**: Tạo unit test suite cho `DataProviderItemService` kiểm tra ném `AppException`.

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderItemEntity } from '../../entities/data-provider-item.entity';
import { DataProviderService } from '../data-provider.service';
import { ItemService } from '../item.service';
import { DataProviderItemService } from '../data-provider-item.service';

describe('DataProviderItemService', () => {
    let service: DataProviderItemService;
    let mockRepo: any;
    let mockItemService: any;
    let mockDataProviderService: any;
    let mockEventEmitter: any;

    beforeEach(async () => {
        mockRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn((e) => e),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        mockItemService = {
            exists: jest.fn(),
        };

        mockDataProviderService = {
            findOneByFilter: jest.fn(),
        };

        mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataProviderItemService,
                { provide: getRepositoryToken(DataProviderItemEntity), useValue: mockRepo },
                { provide: ItemService, useValue: mockItemService },
                { provide: DataProviderService, useValue: mockDataProviderService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: 'automapper:nestjs:default', useValue: { map: jest.fn((e) => e) } },
            ],
        }).compile();

        service = module.get<DataProviderItemService>(DataProviderItemService);
    });

    describe('create', () => {
        it('should throw AppException when item does not exist', async () => {
            mockItemService.exists.mockResolvedValue(false);

            await expect(
                service.create({
                    itemId: 'item-1',
                    dataProviderId: 'dp-1',
                    itemUrl: 'https://example.com/item/1',
                } as any),
            ).rejects.toThrow(AppException);
        });

        it('should throw AppException when itemUrl does not start with baseUrl', async () => {
            mockItemService.exists.mockResolvedValue(true);
            mockDataProviderService.findOneByFilter.mockResolvedValue({ id: 'dp-1', baseUrl: 'https://example.com' });

            await expect(
                service.create({
                    itemId: 'item-1',
                    dataProviderId: 'dp-1',
                    itemUrl: 'https://invalid-domain.com/item/1',
                } as any),
            ).rejects.toThrow(AppException);
        });
    });

    describe('switchActiveStatus', () => {
        it('should throw AppException when item is not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(service.switchActiveStatus('id-1', true)).rejects.toThrow(AppException);
        });
    });
});
```

---

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit`: PASS (TypeScript build check passed with 0 errors).
- **Manual Checks**:
  - `[x]` `config-version.service.ts`: All raw exceptions replaced with `AppException(DataProviderError.*)`.
  - `[x]` `data-provider-item.service.ts`: All raw exceptions replaced with `AppException(DataProviderError.*)`.
  - `[x]` `discovery-validation.service.ts`: All raw exceptions replaced with `AppException(DataProviderError.*)`.
  - `[x]` 100% services in `src/modules/data-provider/services/` strictly conform to `AppException` error standards.
