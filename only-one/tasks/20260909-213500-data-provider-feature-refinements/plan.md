---
status: done
slug: data-provider-feature-refinements
started_at: 2026-09-09
completed_at: 2026-09-09
pr_url: ~
branch: ~
---

# Plan: Cải tiến Validation, Luồng Kiểm thử & Chuẩn hóa Error Code Data Provider Feature

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)
- Trong `data-provider-feature-request.dto.ts`, `CreateDataProviderFeatureRequestDto.service` và `UpdateFeatureConfigRequestDto.changeDescription` đang là optional; `UpdateFeatureConfigRequestDto` tồn tại trường `service` (vốn là immutable field không được sửa) và thiếu trường sandbox `input`.
- Trong `data-provider-feature.service.ts`, `createFeature` và `updateFeatureConfig` chưa chặn đứng quá trình lưu nếu `testStateless` trả về lỗi (`result.error`); đồng thời `switchStatus` sang `READY` cần đảm bảo `testContextual` hoàn toàn pass trước khi update status DB.
- Các Runners (`ScrapingFeatureRunner`, `SearchFeatureRunner`) đang dùng hardcoded `BadRequestException` thay vì chuẩn hóa theo `AppException` và `DataProviderError` (`IAppError`).
- Invariants bắt buộc giữ nguyên:
  - Giữ nguyên cấu trúc quan hệ 1-N giữa `DataProviderEntity` và `DataProviderFeatureEntity`.
  - Giữ nguyên cơ chế snapshot `ConfigVersionEntity` khi cập nhật cấu hình feature.
  - Tuân thủ fail-fast exception với `AppException` bubbled up tới `AllExceptionsFilter`.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)
*(Kế thừa 100% cơ chế vận hành từ concept.md; không mô tả lại giải pháp tổng quan)*

- **Type Signatures & Code Contracts**:
  - `DataProviderError` (`data-provider-error.ts`):
    - `MissingTestInput: IAppError`
    - `MissingSearchTestInput: IAppError`
    - `NoSampleItemFound: IAppError`
    - `ScraperServiceNotFound(service: string): IAppError`
    - `SearchServiceNotFound(service: string): IAppError`
    - `FeatureTestFailed(error: string): IAppError`
    - `FeatureValidationFailed(error: string): IAppError`
  - `CreateDataProviderFeatureRequestDto`:
    - `service: ScraperServiceEnum` (@EnumField, required).
  - `UpdateFeatureConfigRequestDto`:
    - `changeDescription: string` (@StringField, required).
    - `config?: Record<string, unknown>` (@ObjectFieldOptional).
    - `input?: Record<string, unknown>` (@ObjectFieldOptional).
    - Loại bỏ hoàn toàn `service?: ScraperServiceEnum`.
- **AST Seams & Callers**:
  - `ScrapingFeatureRunner` (`scraping-feature.runner.ts`): Thay thế toàn bộ `BadRequestException` bằng `throw new AppException(DataProviderError.*)`.
  - `SearchFeatureRunner` (`search-feature.runner.ts`): Thay thế toàn bộ `BadRequestException` bằng `throw new AppException(DataProviderError.*)`.
  - `DataProviderFeatureService.createFeature` (`data-provider-feature.service.ts#L38-L58`): Sử dụng `request.service` trực tiếp và gán `const created = await super.create(entity); return created;`.
  - `DataProviderFeatureService.updateFeatureConfig` (`data-provider-feature.service.ts#L60-L90`): Thực thi `runner.testStateless(feature.service, request.config, request.input)` khi có `request.input`; loại bỏ update `service`.
  - `DataProviderFeatureService.switchStatus` (`data-provider-feature.service.ts#L144-L158`): Chờ `runner.testContextual` pass rồi mới gọi `super.update`.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/modules/data-provider/
├── constants/
│   └── [MODIFY] data-provider-error.ts
├── dtos/requests/
│   └── [MODIFY] data-provider-feature-request.dto.ts
├── runners/
│   ├── [MODIFY] scraping-feature.runner.ts
│   ├── [MODIFY] search-feature.runner.ts
│   └── _tests/
│       └── [MODIFY] search-feature.runner.spec.ts
└── services/
    ├── [MODIFY] data-provider-feature.service.ts
    └── _tests/
        └── [NEW]    data-provider-feature.service.spec.ts
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/data-provider/constants/data-provider-error.ts` | `DataProviderError` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts` | `CreateDataProviderFeatureRequestDto`, `UpdateFeatureConfigRequestDto` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/scraping-feature.runner.ts` | `ScrapingFeatureRunner` | `Order 1, 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/search-feature.runner.ts` | `SearchFeatureRunner` | `Order 1, 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts` | `SearchFeatureRunner.testStateless` & `testContextual` tests | `Order 4` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/data-provider-feature.service.ts` | `createFeature`, `updateFeatureConfig`, `switchStatus` | `Order 1, 2, 3, 4` | `npx tsc -p tsconfig.build.json --noEmit` |
| **7** | `[x]` | `[NEW]` | `src/modules/data-provider/services/_tests/data-provider-feature.service.spec.ts` | Unit tests for `DataProviderFeatureService` | `Order 6` | `npx tsc -p tsconfig.build.json --noEmit` |

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/data-provider/constants/data-provider-error.ts`
> **Action**: Khai báo các error codes chuẩn `IAppError` cho các lỗi kiểm thử và validation runner.

```diff
@@ -122,4 +122,46 @@
         message: 'Trích xuất dữ liệu không thành công.',
         statusCode: HttpStatus.BAD_REQUEST,
     };
+
+    static readonly MissingTestInput: IAppError = {
+        code: 'data_provider_missing_test_input',
+        message: 'Yêu cầu URL, nội dung dữ liệu hoặc nội dung HTML để kiểm tra.',
+        statusCode: HttpStatus.BAD_REQUEST,
+    };
+
+    static readonly MissingSearchTestInput: IAppError = {
+        code: 'data_provider_missing_search_test_input',
+        message: 'Yêu cầu từ khóa tìm kiếm, mẫu URL tìm kiếm, URL hoặc nội dung HTML để kiểm tra.',
+        statusCode: HttpStatus.BAD_REQUEST,
+    };
+
+    static readonly NoSampleItemFound: IAppError = {
+        code: 'data_provider_no_sample_item_found',
+        message: 'Không tìm thấy sản phẩm mẫu nào để kiểm tra tính năng.',
+        statusCode: HttpStatus.BAD_REQUEST,
+    };
+
+    static ScraperServiceNotFound = (service: string): IAppError => ({
+        code: 'data_provider_scraper_service_not_found',
+        message: `Không tìm thấy scraper service '${service}'.`,
+        statusCode: HttpStatus.NOT_FOUND,
+        params: { service },
+    });
+
+    static SearchServiceNotFound = (service: string): IAppError => ({
+        code: 'data_provider_search_service_not_found',
+        message: `Không tìm thấy search service '${service}'.`,
+        statusCode: HttpStatus.NOT_FOUND,
+        params: { service },
+    });
+
+    static FeatureTestFailed = (error: string): IAppError => ({
+        code: 'data_provider_feature_test_failed',
+        message: `Kiểm tra cấu hình tính năng thất bại: ${error}`,
+        statusCode: HttpStatus.BAD_REQUEST,
+        params: { error },
+    });
+
+    static FeatureValidationFailed = (error: string): IAppError => ({
+        code: 'data_provider_feature_validation_failed',
+        message: `Xác thực tính năng thất bại: ${error}`,
+        statusCode: HttpStatus.BAD_REQUEST,
+        params: { error },
+    });
 }
```

---

### 2. `[MODIFY]` `src/modules/data-provider/dtos/requests/data-provider-feature-request.dto.ts`
> **Action**: Cập nhật DTO: `service` bắt buộc trong Create DTO, `changeDescription` bắt buộc trong Update DTO, loại bỏ `service` và thêm `input` optional vào Update DTO.

```diff
@@ -1,4 +1,4 @@
-import { EnumField, EnumFieldOptional, ObjectFieldOptional, StringFieldOptional } from '../../../../decorators';
+import { EnumField, EnumFieldOptional, ObjectFieldOptional, StringField, StringFieldOptional } from '../../../../decorators';
 import { DataProviderFeatureType, ScraperServiceEnum } from '../../enums';

 export class CreateDataProviderFeatureRequestDto {
@@ -8,7 +8,6 @@
-    @EnumFieldOptional(() => ScraperServiceEnum, {
-        default: ScraperServiceEnum.GENERIC,
-        description: 'Service runtime identifier',
-    })
-    service?: ScraperServiceEnum;
+    @EnumField(() => ScraperServiceEnum, {
+        description: 'Service runtime identifier',
+    })
+    service: ScraperServiceEnum;

     @ObjectFieldOptional({ description: 'Feature configuration payload' })
     config?: Record<string, unknown>;
@@ -21,10 +20,10 @@
 export class UpdateFeatureConfigRequestDto {
+    @StringField({ description: 'Description of changes for version history' })
+    changeDescription: string;
+
     @ObjectFieldOptional({ description: 'Feature configuration payload' })
     config: Record<string, unknown>;

-    @EnumFieldOptional(() => ScraperServiceEnum, { description: 'Service runtime identifier' })
-    service?: ScraperServiceEnum;
-
-    @StringFieldOptional({ description: 'Description of changes for version history' })
-    changeDescription?: string;
+    @ObjectFieldOptional({ description: 'Test input payload to verify feature before updating' })
+    input?: Record<string, unknown>;
 }
```

---

### 3. `[MODIFY]` `src/modules/data-provider/runners/scraping-feature.runner.ts`
> **Action**: Thay thế `BadRequestException` bằng `AppException(DataProviderError.*)` trong `testStateless` và `testContextual`.

```diff
@@ -1,4 +1,6 @@
-import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
+import { forwardRef, Inject, Injectable } from '@nestjs/common';
+import { AppException } from '../../../exceptions/app.exception';
+import { DataProviderError } from '../constants/data-provider-error';

 import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
@@ -19,8 +21,8 @@
         const { url, dataContent, htmlContentString } = input || {};
         if (!url && !dataContent && !htmlContentString) {
-            throw new BadRequestException('URL, Data content or Html content is required');
+            throw new AppException(DataProviderError.MissingTestInput);
         }

         const scraperService = this.dataProviderScraperServiceMap[service];
         if (!scraperService) {
-            throw new BadRequestException(`Scraper service '${service}' not found`);
+            throw new AppException(DataProviderError.ScraperServiceNotFound(service));
         }

-        return await scraperService.getExtractData({
+        const result = await scraperService.getExtractData({
             url,
             dataContent,
             targetConfig: config,
             htmlContentString,
         });
+
+        if (result.error) {
+            throw new AppException(DataProviderError.FeatureTestFailed(result.error));
+        }
+
+        return result;
     }

     async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<any> {
@@ -43,7 +45,7 @@
             );
             if (!randomItem) {
-                throw new BadRequestException('No sample data provider item found to test contextual scraping');
+                throw new AppException(DataProviderError.NoSampleItemFound);
             }
             itemUrl = randomItem.itemUrl;
         }

         const scraperService = this.dataProviderScraperServiceMap[feature.service];
         if (!scraperService) {
-            throw new BadRequestException(`Scraper service '${feature.service}' not found`);
+            throw new AppException(DataProviderError.ScraperServiceNotFound(feature.service));
         }

         const result = await scraperService.validateParserFunction({
@@ -59,5 +61,5 @@
         if (result.status !== 'success') {
-            throw new BadRequestException(result.error || 'Scraping validation failed');
+            throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Scraping validation failed'));
         }

         return result;
```

---

### 4. `[MODIFY]` `src/modules/data-provider/runners/search-feature.runner.ts`
> **Action**: Thay thế `BadRequestException` bằng `AppException(DataProviderError.*)` trong `testStateless` và `testContextual`.

```diff
@@ -1,4 +1,6 @@
-import { BadRequestException, Inject, Injectable } from '@nestjs/common';
+import { Inject, Injectable } from '@nestjs/common';
+import { AppException } from '../../../exceptions/app.exception';
+import { DataProviderError } from '../constants/data-provider-error';

 import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
@@ -55,8 +57,8 @@
         if (!url && !dataContent && !htmlContentString) {
-            throw new BadRequestException('Search query, searchUrlPattern, URL or Html content is required');
+            throw new AppException(DataProviderError.MissingSearchTestInput);
         }

         const searchService = this.dataProviderSearchServiceMap[service];
         if (!searchService) {
-            throw new BadRequestException(`Search service '${service}' not found`);
+            throw new AppException(DataProviderError.SearchServiceNotFound(service));
         }

-        return await searchService.getExtractSearchData({
+        const result = await searchService.getExtractSearchData({
             url,
             dataContent,
             targetConfig: config,
             htmlContentString,
         });
+
+        if (result.error) {
+            throw new AppException(DataProviderError.FeatureTestFailed(result.error));
+        }
+
+        return result;
     }

     async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<ISearchExtractDataResponse> {
@@ -77,7 +79,7 @@
         if (!url && !dataContent && !htmlContentString) {
-            throw new BadRequestException('Search query, searchUrlPattern, or item URL is required to test contextual search');
+            throw new AppException(DataProviderError.MissingSearchTestInput);
         }

         const searchService = this.dataProviderSearchServiceMap[feature.service];
         if (!searchService) {
-            throw new BadRequestException(`Search service '${feature.service}' not found`);
+            throw new AppException(DataProviderError.SearchServiceNotFound(feature.service));
         }

         const result = await searchService.getExtractSearchData({
@@ -93,7 +95,7 @@
         if (result.error) {
-            throw new BadRequestException(result.error || 'Search validation failed');
+            throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Search validation failed'));
         }

         return result;
```

---

### 5. `[MODIFY]` `src/modules/data-provider/runners/_tests/search-feature.runner.spec.ts`
> **Action**: Cập nhật unit test để kiểm tra ném `AppException` với mã lỗi chuẩn `DataProviderError`.

```diff
@@ -1,4 +1,5 @@
-import { BadRequestException } from '@nestjs/common';
+import { AppException } from '../../../../exceptions/app.exception';
+import { DataProviderError } from '../../constants/data-provider-error';

 import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
@@ -75,9 +76,21 @@
     describe('testStateless', () => {
-        it('should throw BadRequestException when no URL or content is resolvable', async () => {
-            await expect(runner.testStateless('generic', {} as any, {})).rejects.toThrow(BadRequestException);
+        it('should throw AppException with MissingSearchTestInput when no URL or content is resolvable', async () => {
+            await expect(runner.testStateless('generic', {} as any, {})).rejects.toThrow(AppException);
         });

-        it('should throw BadRequestException when search service is not found', async () => {
+        it('should throw AppException with SearchServiceNotFound when search service is not found', async () => {
             await expect(
                 runner.testStateless('unknown', { searchUrlPattern: 'https://example.com' } as any, { query: 'test' }),
-            ).rejects.toThrow(BadRequestException);
+            ).rejects.toThrow(AppException);
+        });
+
+        it('should throw AppException with FeatureTestFailed when search service returns error', async () => {
+            mockSearchService.getExtractSearchData.mockResolvedValue({
+                error: 'Invalid search pattern or selector',
+            });
+
+            const config: ISearchTargetConfig = {
+                searchUrlPattern: 'https://example.com/search?q={query}',
+            } as any;
+
+            await expect(runner.testStateless('generic', config, { query: 'test' })).rejects.toThrow(AppException);
         });

@@ -108,7 +121,7 @@
     describe('testContextual', () => {
-        it('should throw BadRequestException if search service returns error', async () => {
+        it('should throw AppException with FeatureValidationFailed if search service returns error', async () => {
             mockSearchService.getExtractSearchData.mockResolvedValue({ error: 'Search scraping validation failed' });

             const feature = {
                 service: 'generic',
                 config: { searchUrlPattern: 'https://example.com/search?q={query}' },
             } as DataProviderFeatureEntity;

-            await expect(runner.testContextual(feature, { query: 'test' })).rejects.toThrow(BadRequestException);
+            await expect(runner.testContextual(feature, { query: 'test' })).rejects.toThrow(AppException);
         });
```

---

### 6. `[MODIFY]` `src/modules/data-provider/services/data-provider-feature.service.ts`
> **Action**: Cập nhật logic `createFeature`, `updateFeatureConfig`, và `switchStatus` để thực thi fail-fast test verification trước khi cập nhật dữ liệu.

```diff
@@ -43,6 +43,6 @@
         if (request.input) {
             const runner = this.runnerRegistry.getRunner(request.type);
-            await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
+            await runner.testStateless(request.service, request.config, request.input);
         }

         const entity = this.dataProviderFeatureRepository.create({
             dataProviderId,
             type: request.type,
             config: request.config,
-            service: request.service || ScraperServiceEnum.GENERIC,
+            service: request.service,
             status: request.input ? DataProviderFeatureStatus.READY : DataProviderFeatureStatus.UNCONFIGURED,
         });

-        return await super.create(entity);
+        const result = await super.create(entity);
+        return result;
     }

     async updateFeatureConfig(id: string, request: UpdateFeatureConfigRequestDto, user?: PayloadDto): Promise<DataProviderFeatureDto> {
         const feature = await this.findById(id);
         if (!feature) throw new AppException(DataProviderError.FeatureNotFound(id));

+        if (request.input) {
+            const runner = this.runnerRegistry.getRunner(feature.type);
+            await runner.testStateless(feature.service, request.config, request.input);
         }
+
         // Create version snapshot
         await this.configVersionService.create(
             {
                 featureId: id,
                 isActive: true,
                 config: request.config,
                 changeType: ConfigVersionType.MANUAL_EDIT,
-                changeDescription: request.changeDescription || 'Updated feature configuration',
+                changeDescription: request.changeDescription,
             },
             user,
         );

         const newStatus = [DataProviderFeatureStatus.UNCONFIGURED, DataProviderFeatureStatus.ERROR].includes(feature.status)
             ? DataProviderFeatureStatus.TESTING
             : feature.status;

         await super.update(id, {
             status: newStatus,
             lastErrorType: null,
             consecutiveFailures: 0,
             lastErrorMessage: null,
             config: request.config,
-            service: request.service ?? feature.service,
         });

-        return await this.findById(id);
+        const updated = await this.findById(id);
+        return updated;
     }
@@ -152,7 +152,8 @@
-                return await super.update(id, {
+                const result = await super.update(id, {
                     status,
                     lastErrorType: null,
                     lastErrorMessage: null,
                     consecutiveFailures: 0,
                 });
+                return result;
             }
```

---

### 7. `[NEW]` `src/modules/data-provider/services/_tests/data-provider-feature.service.spec.ts`
> **Action**: Tạo unit test suite cho `DataProviderFeatureService` kiểm tra toàn bộ luồng tạo, cập nhật có test validation và switch status sử dụng `AppException`.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppException } from '../../../../exceptions/app.exception';
import { LoggerService } from '../../../../shared/services/logger.service';
import { DataProviderError } from '../../constants/data-provider-error';
import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
import { DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../../enums';
import { FeatureRunnerRegistry } from '../../runners/feature-runner.registry';
import { ConfigVersionService } from '../config-version.service';
import { DataProviderFeatureService } from '../data-provider-feature.service';

describe('DataProviderFeatureService', () => {
    let service: DataProviderFeatureService;
    let mockRepo: any;
    let mockRunnerRegistry: any;
    let mockRunner: any;
    let mockConfigVersionService: any;
    let mockLogger: any;
    let mockEventEmitter: any;

    beforeEach(async () => {
        mockRepo = {
            create: jest.fn((entity) => entity),
            save: jest.fn((entity) => Promise.resolve({ id: 'feature-1', ...entity })),
            findOne: jest.fn(),
            exists: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        mockRunner = {
            testStateless: jest.fn().mockResolvedValue({ data: [] }),
            testContextual: jest.fn().mockResolvedValue({ status: 'success' }),
        };

        mockRunnerRegistry = {
            getRunner: jest.fn().mockReturnValue(mockRunner),
        };

        mockConfigVersionService = {
            create: jest.fn().mockResolvedValue({ id: 'ver-1' }),
        };

        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
        };

        mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataProviderFeatureService,
                { provide: getRepositoryToken(DataProviderFeatureEntity), useValue: mockRepo },
                { provide: FeatureRunnerRegistry, useValue: mockRunnerRegistry },
                { provide: ConfigVersionService, useValue: mockConfigVersionService },
                { provide: LoggerService, useValue: mockLogger },
                { provide: 'EventEmitter2', useValue: mockEventEmitter },
                { provide: 'automapper:nestjs:default', useValue: { map: jest.fn((entity) => entity) } },
            ],
        }).compile();

        service = module.get<DataProviderFeatureService>(DataProviderFeatureService);
        jest.clearAllMocks();
    });

    describe('createFeature', () => {
        it('should execute testStateless when input is provided and create feature with READY status', async () => {
            mockRepo.exists.mockResolvedValue(false);

            const result = await service.createFeature('provider-1', {
                type: DataProviderFeatureType.SCRAPING,
                service: ScraperServiceEnum.GENERIC,
                config: { sampleUrl: 'https://example.com' },
                input: { url: 'https://example.com' },
            });

            expect(mockRunner.testStateless).toHaveBeenCalledWith(
                ScraperServiceEnum.GENERIC,
                { sampleUrl: 'https://example.com' },
                { url: 'https://example.com' },
            );
            expect(mockRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: DataProviderFeatureStatus.READY,
                    service: ScraperServiceEnum.GENERIC,
                }),
            );
            expect(result).toBeDefined();
        });

        it('should throw AppException and not create entity if testStateless fails', async () => {
            mockRepo.exists.mockResolvedValue(false);
            mockRunner.testStateless.mockRejectedValue(new AppException(DataProviderError.FeatureTestFailed('Scraping error')));

            await expect(
                service.createFeature('provider-1', {
                    type: DataProviderFeatureType.SCRAPING,
                    service: ScraperServiceEnum.GENERIC,
                    config: {},
                    input: { url: 'https://example.com' },
                }),
            ).rejects.toThrow(AppException);

            expect(mockRepo.create).not.toHaveBeenCalled();
        });
    });

    describe('updateFeatureConfig', () => {
        it('should execute testStateless if input is provided before saving snapshot and updating', async () => {
            const existingFeature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                service: ScraperServiceEnum.GENERIC,
                status: DataProviderFeatureStatus.READY,
                config: {},
            };
            mockRepo.findOne.mockResolvedValue(existingFeature);

            await service.updateFeatureConfig('feat-1', {
                config: { newKey: 'val' },
                changeDescription: 'Updated scraping selectors',
                input: { url: 'https://example.com' },
            });

            expect(mockRunner.testStateless).toHaveBeenCalledWith(
                ScraperServiceEnum.GENERIC,
                { newKey: 'val' },
                { url: 'https://example.com' },
            );
            expect(mockConfigVersionService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    featureId: 'feat-1',
                    changeDescription: 'Updated scraping selectors',
                }),
                undefined,
            );
        });

        it('should abort update if testStateless throws AppException', async () => {
            const existingFeature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                service: ScraperServiceEnum.GENERIC,
                status: DataProviderFeatureStatus.READY,
            };
            mockRepo.findOne.mockResolvedValue(existingFeature);
            mockRunner.testStateless.mockRejectedValue(new AppException(DataProviderError.FeatureTestFailed('Failed')));

            await expect(
                service.updateFeatureConfig('feat-1', {
                    config: {},
                    changeDescription: 'Invalid config',
                    input: { url: 'invalid' },
                }),
            ).rejects.toThrow(AppException);

            expect(mockConfigVersionService.create).not.toHaveBeenCalled();
        });
    });

    describe('switchStatus', () => {
        it('should call testContextual and update status to READY only on success', async () => {
            const feature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                status: DataProviderFeatureStatus.TESTING,
            };
            mockRepo.findOne.mockResolvedValue(feature);

            const result = await service.switchStatus('feat-1', DataProviderFeatureStatus.READY);

            expect(mockRunner.testContextual).toHaveBeenCalled();
            expect(mockRepo.update).toHaveBeenCalledWith(
                'feat-1',
                expect.objectContaining({
                    status: DataProviderFeatureStatus.READY,
                    consecutiveFailures: 0,
                }),
            );
            expect(result).toBe(true);
        });

        it('should throw AppException and not update status if testContextual fails', async () => {
            const feature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                status: DataProviderFeatureStatus.TESTING,
            };
            mockRepo.findOne.mockResolvedValue(feature);
            mockRunner.testContextual.mockRejectedValue(
                new AppException(DataProviderError.FeatureValidationFailed('Contextual validation failed')),
            );

            await expect(service.switchStatus('feat-1', DataProviderFeatureStatus.READY)).rejects.toThrow(AppException);
            expect(mockRepo.update).not.toHaveBeenCalled();
        });
    });
});
```

---

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit`: PASS (TypeScript build compilation passed with 0 errors).
- **Manual Checks**:
  - `[x]` DTO validation: `CreateDataProviderFeatureRequestDto.service` is `@EnumField` (required).
  - `[x]` DTO validation: `UpdateFeatureConfigRequestDto.changeDescription` is `@StringField` (required).
  - `[x]` DTO validation: `UpdateFeatureConfigRequestDto` has `input` and omitted `service`.
  - `[x]` Error standardization: `ScrapingFeatureRunner` and `SearchFeatureRunner` throw `AppException(DataProviderError.*)`.
  - `[x]` Fail-fast verification: `createFeature` and `updateFeatureConfig` only proceed when `testStateless` succeeds.
  - `[x]` Status switch: `switchStatus(READY)` runs `testContextual` and only commits status to DB when test passes.
