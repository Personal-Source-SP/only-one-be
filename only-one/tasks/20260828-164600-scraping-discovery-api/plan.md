---
status: done
slug: scraping-discovery-api
started_at: 2026-08-28
completed_at: 2026-08-28
pr_url: ~
branch: ~
---

# Plan: Scraping Discovery & Deterministic URL Validation Engine

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

### 1.1 Bối cảnh & Phân tích Hiện trạng
- **Frontend State**: Giao diện Scraping Discovery tại [only-one-fe/src/app/(root)/scraping/discovery](file:///Users/kiem/Sources/Personal/only-one-fe/src/app/%28root%29/scraping/discovery) đã sẵn sàng các trang:
  - Trang danh sách [page.tsx](file:///Users/kiem/Sources/Personal/only-one-fe/src/app/%28root%29/scraping/discovery/page.tsx) và modal tạo phiên [CreateSessionModal.tsx](file:///Users/kiem/Sources/Personal/only-one-fe/src/app/%28root%29/scraping/discovery/components/CreateSessionModal.tsx).
  - Trang chi tiết phiên [[id]/page.tsx](file:///Users/kiem/Sources/Personal/only-one-fe/src/app/%28root%29/scraping/discovery/%5Bid%5D/page.tsx) hiển thị các chỉ số tổng quan (Session Metrics) và bảng danh sách URL phát hiện được (`IDiscoveryUrl`) kèm chức năng **Batch Enqueue** ("Đẩy vào hàng đợi cào").
- **Backend State**: Module [data-provider.module.ts](file:///Users/kiem/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.module.ts) tại `only-one-be` chưa có các thực thể và API phục vụ Discovery & Validation lifecycle.
- **Reference Logic từ Orien-Trade**: Codebase [orien-trade-backend/src/modules/data-provider/services/ai-validation.service.ts](file:///Users/kiem/Sources/Orien-Trade/orien-trade-backend/src/modules/data-provider/services/ai-validation.service.ts) và [ai-product-mapping-helper.ts](file:///Users/kiem/Sources/Orien-Trade/orien-trade-backend/src/modules/data-provider/helpers/ai-product-mapping-helper.ts) cung cấp toàn bộ kiến trúc xử lý:
  - Quản lý Batch Validation, Progress Tracking, Audit Logs.
  - Sàng lọc ứng viên bằng Fuzzy Search (`Fuse.js`) và Heuristics nhận diện Product Detail Page (PDP).
  - Trích xuất giá tiền & tiền tệ (`detectPriceInText`).
  - Quy trình duyệt của người dùng (User Action: `CONFIRM`, `REJECT`, `EXCLUDE`).
  - Chúng ta sẽ mang toàn bộ logic kiến trúc này vào `only-one-be` dưới dạng **Deterministic Validation Engine** (chạy local, tốc độ sub-second, 0 đồng token cost, nhưng có sẵn abstraction seam để cắm AI sau này).

### 1.2 Invariants (Danh sách hành vi bắt buộc giữ nguyên)
1. **DataProvider Independence**: Duy trì `DataProviderEntity` độc lập, không gắn quan hệ phân cấp cha-con theo `rules.md`.
2. **Standardized Pagination**: Tất cả các API danh sách (`GET /discovery-sessions`, `GET /discovery-urls`) phải tuân thủ chuẩn `nestjs-paginate` kết hợp với [BaseController](file:///Users/kiem/Sources/Personal/only-one-be/src/common/base.controller.ts).
3. **Deterministic Scoring Consistency**: Cùng một URL và từ khóa đầu vào thì thuật toán Heuristic & Fuzzy Matching phải trả về cùng một `confidenceScore` và `matchResult`.
4. **Transactional Batch Operations**: Thao tác Batch Validate, User Action Review, và Batch Enqueue sang `ScrapingData` phải thực hiện an toàn trong database transaction.

---

## Section 2. Detailed Design (Thiết kế Kỹ thuật Chi tiết)

### 2.1 Kiến trúc Thực thể & Cơ sở Dữ liệu (Entity Architecture)
```
+--------------------------+       1:N       +--------------------------+
|  DiscoverySessionEntity  | <-------------> |    DiscoveryUrlEntity    |
| (sessionCode, targetUrl, |                 | (url, domain, title,     |
|  depth, maxUrls, status, |                 |  confidenceScore,        |
|  totalDiscovered, ...)   |                 |  validationStatus,       |
+--------------------------+                 |  matchResult, userAction)|
            | 1:N                                     | 1:N
            v                                         v
+------------------------------+             +------------------------------+
| DiscoveryValidationBatch     |             | DiscoveryValidationLog       |
| (batchNumber, status,        |             | (confidenceScore, reason,    |
|  totalUrls, processedUrls)   |             |  matchedCriteria, duration)  |
+------------------------------+             +------------------------------+
```

1. **`DiscoverySessionEntity`** (`discovery_sessions`):
   - `id`: UUID (Primary Key)
   - `sessionCode`: `varchar(50)` (Unique index, e.g. `DISC-AMZ-001`)
   - `dataProviderId`: `uuid` (Foreign Key -> `data_providers.id`)
   - `targetUrl`: `varchar(2000)`
   - `status`: Enum `DiscoverySessionStatus` (`pending`, `in_progress`, `completed`, `failed`)
   - `depth`: `integer` (Default: 1)
   - `maxUrls`: `integer` (Default: 100)
   - `totalDiscovered`: `integer` (Default: 0)
   - `totalQueued`: `integer` (Default: 0)
   - `totalValidated`: `integer` (Default: 0)
   - `durationSeconds`: `integer` (Nullable)
   - `errorMessage`: `text` (Nullable)
   - `notes`: `text` (Nullable)
   - *Relations*: `@ManyToOne(DataProviderEntity)`, `@OneToMany(DiscoveryUrlEntity)`, `@OneToMany(DiscoveryValidationBatchEntity)`.

2. **`DiscoveryUrlEntity`** (`discovery_urls`):
   - `id`: UUID (Primary Key)
   - `sessionId`: `uuid` (Foreign Key -> `discovery_sessions.id`)
   - `dataProviderId`: `uuid` (Foreign Key -> `data_providers.id`)
   - `url`: `varchar(2000)`
   - `domain`: `varchar(500)`
   - `title`: `varchar(1000)` (Nullable)
   - `description`: `text` (Nullable)
   - `status`: Enum `DiscoveryUrlStatus` (`discovered`, `queued`, `scraped`, `failed`)
   - `foundAtDepth`: `integer` (0, 1, 2...)
   - `confidenceScore`: `decimal(3, 2)` (0.00 – 1.00, Default: 0)
   - `priceDetected`: `boolean` (Default: false)
   - `detectedPrice`: `decimal(10, 2)` (Nullable)
   - `detectedCurrency`: `varchar(10)` (Nullable)
   - `validationStatus`: Enum `DiscoveryValidationStatus` (`pending`, `processing`, `completed`, `failed`, `skipped`)
   - `matchResult`: Enum `ValidationMatchResult` (`exact_match`, `partial_match`, `no_match`, `uncertain`)
   - `userAction`: Enum `ValidationUserAction` (`confirm`, `reject`, `exclude`) (Nullable)
   - `userActionDate`: `timestamptz` (Nullable)
   - `userActionReason`: `text` (Nullable)
   - `finalValidationStatus`: Enum `FinalValidationStatus` (`pending_review`, `approved`, `rejected`)
   - *Unique Index*: `['sessionId', 'url']`.

3. **`DiscoveryValidationBatchEntity`** (`discovery_validation_batches`):
   - `id`: UUID (Primary Key)
   - `sessionId`: `uuid` (Foreign Key -> `discovery_sessions.id`)
   - `batchNumber`: `varchar(50)`
   - `status`: Enum `ValidationBatchStatus` (`pending`, `processing`, `completed`, `cancelled`, `failed`)
   - `totalUrls`: `integer` (Default: 0)
   - `processedUrls`: `integer` (Default: 0)
   - `matchedUrls`: `integer` (Default: 0)
   - `noMatchUrls`: `integer` (Default: 0)
   - `startedAt`: `timestamptz` (Nullable)
   - `completedAt`: `timestamptz` (Nullable)
   - `reasonCancelled`: `text` (Nullable)

4. **`DiscoveryValidationLogEntity`** (`discovery_validation_logs`):
   - `id`: UUID (Primary Key)
   - `sessionId`: `uuid`
   - `discoveryUrlId`: `uuid`
   - `validationBatchId`: `uuid`
   - `operationStatus`: `varchar(20)` (`completed`, `failed`)
   - `matchResult`: Enum `ValidationMatchResult`
   - `confidenceScore`: `decimal(3, 2)`
   - `reason`: `text`
   - `matchedCriteria`: `jsonb` (ghi nhận: { isPdp: true, hasPrice: true, fuzzySimilarity: 0.85, positiveKeywords: ['/dp/'], negativeKeywords: [] })
   - `processingDuration`: `integer` (ms)
   - `isLatestLog`: `boolean` (Default: true)

---

### 2.2 Deterministic Validation Engine (`DiscoveryValidationHelper`)

Quy trình chấm điểm 3 tầng không phụ thuộc AI:
```
                                [Discovered URL]
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     [Layer 1: PDP Path Analysis]                 [Layer 2: Price Extraction]
  - Positive Regex: /dp/|/product/|/item/       - detectPriceInText (Regex Currency & Digits)
  - Negative Regex: /category/|/cart/|/search   - Output: priceDetected, detectedPrice, currency
  - Path Score (0.0 -> 0.4)                     - Price Score (0.0 -> 0.2)
                └──────────────────────┬──────────────────────┘
                                       │
                                       ▼
                         [Layer 3: Fuzzy Matching]
                      - Fuse.js / Levenshtein Token Overlap
                      - Target Product/Domain vs Page Title/URL Slug
                      - Fuzzy Score (0.0 -> 0.4)
                                       │
                                       ▼
                   [Total Confidence Score = L1 + L2 + L3]
                                (0.00 – 1.00)
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
  Score >= 0.75                  0.45 <= Score < 0.75            Score < 0.45
 [EXACT_MATCH]                  [PARTIAL_MATCH]                  [NO_MATCH]
```

---

## Section 3. Implementation Architecture & Machine-Readable Task Matrix

### 3.1 Machine-Readable Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/modules/data-provider/enums/discovery-session-status.enum.ts` | `DiscoverySessionStatus` | `None` | `npm run build` |
| **2** | `[x]` | `[NEW]` | `src/modules/data-provider/enums/discovery-url-status.enum.ts` | `DiscoveryUrlStatus`, `DiscoveryValidationStatus`, `ValidationMatchResult`, `ValidationUserAction`, `FinalValidationStatus`, `ValidationBatchStatus` | `None` | `npm run build` |
| **3** | `[x]` | `[MODIFY]` | `src/modules/data-provider/enums/index.ts` | `export * from './discovery-*.enum'` | `Order 1, 2` | `npm run build` |
| **4** | `[x]` | `[NEW]` | `src/modules/data-provider/entities/discovery-session.entity.ts` | `DiscoverySessionEntity` | `Order 1, 3` | `npm run build` |
| **5** | `[x]` | `[NEW]` | `src/modules/data-provider/entities/discovery-url.entity.ts` | `DiscoveryUrlEntity` | `Order 2, 4` | `npm run build` |
| **6** | `[x]` | `[NEW]` | `src/modules/data-provider/entities/discovery-validation-batch.entity.ts` | `DiscoveryValidationBatchEntity` | `Order 2, 4` | `npm run build` |
| **7** | `[x]` | `[NEW]` | `src/modules/data-provider/entities/discovery-validation-log.entity.ts` | `DiscoveryValidationLogEntity` | `Order 2, 5, 6` | `npm run build` |
| **8** | `[x]` | `[MODIFY]` | `src/modules/data-provider/entities/data-provider.entity.ts` | `DataProviderEntity.discoverySessions`, `discoveryUrls` | `Order 4, 5` | `npm run build` |
| **9** | `[x]` | `[NEW]` | `src/modules/data-provider/dtos/discovery-session.dto.ts` | `DiscoverySessionDto` | `Order 1, 4` | `npm run build` |
| **10** | `[x]` | `[NEW]` | `src/modules/data-provider/dtos/discovery-url.dto.ts` | `DiscoveryUrlDto` | `Order 2, 5` | `npm run build` |
| **11** | `[x]` | `[NEW]` | `src/modules/data-provider/dtos/discovery-validation-batch.dto.ts` | `DiscoveryValidationBatchDto` | `Order 2, 6` | `npm run build` |
| **12** | `[x]` | `[NEW]` | `src/modules/data-provider/dtos/requests/create-discovery-session-request.dto.ts` | `CreateDiscoverySessionRequestDto` | `Order 1` | `npm run build` |
| **13** | `[x]` | `[NEW]` | `src/modules/data-provider/dtos/requests/discovery-validation-request.dto.ts` | `TriggerValidationRequestDto`, `SubmitUserActionRequestDto`, `SubmitBulkUserActionRequestDto`, `RevalidateUrlRequestDto`, `CancelValidationBatchRequestDto` | `Order 2` | `npm run build` |
| **14** | `[x]` | `[NEW]` | `src/modules/data-provider/dtos/requests/batch-enqueue-discovery-urls-request.dto.ts` | `BatchEnqueueDiscoveryUrlsRequestDto` | `None` | `npm run build` |
| **15** | `[x]` | `[MODIFY]` | `src/modules/data-provider/dtos/requests/index.ts` | `export * from './*discovery*'` | `Order 12, 13, 14` | `npm run build` |
| **16** | `[x]` | `[NEW]` | `src/modules/data-provider/constants/discovery-constants.ts` | `PDP_POSITIVE_KEYWORDS`, `PDP_NEGATIVE_KEYWORDS`, `CONFIDENCE_WEIGHTS` | `None` | `npm run build` |
| **17** | `[x]` | `[NEW]` | `src/modules/data-provider/constants/discovery-session-pagination.config.ts` | `DISCOVERY_SESSION_PAGINATION_CONFIG` | `Order 4` | `npm run build` |
| **18** | `[x]` | `[NEW]` | `src/modules/data-provider/constants/discovery-url-pagination.config.ts` | `DISCOVERY_URL_PAGINATION_CONFIG` | `Order 5` | `npm run build` |
| **19** | `[x]` | `[NEW]` | `src/modules/data-provider/helpers/price-detector.helper.ts` | `PriceDetectorHelper.detectPriceInText` | `None` | `npm test -- src/modules/data-provider/_tests/price-detector.helper.spec.ts` |
| **20** | `[x]` | `[NEW]` | `src/modules/data-provider/helpers/discovery-validation.helper.ts` | `DiscoveryValidationHelper.evaluateUrl` | `Order 16, 19` | `npm test -- src/modules/data-provider/_tests/discovery-validation.helper.spec.ts` |
| **21** | `[x]` | `[NEW]` | `src/modules/data-provider/services/discovery-runner.service.ts` | `DiscoveryRunnerService.crawlSession` | `Order 4, 5, 20` | `npm test -- src/modules/data-provider/_tests/discovery-runner.service.spec.ts` |
| **22** | `[x]` | `[NEW]` | `src/modules/data-provider/services/discovery-session.service.ts` | `DiscoverySessionService` | `Order 4, 17, 21` | `npm test -- src/modules/data-provider/_tests/discovery-session.service.spec.ts` |
| **23** | `[x]` | `[NEW]` | `src/modules/data-provider/services/discovery-validation.service.ts` | `DiscoveryValidationService` | `Order 5, 6, 7, 20` | `npm test -- src/modules/data-provider/_tests/discovery-validation.service.spec.ts` |
| **24** | `[x]` | `[NEW]` | `src/modules/data-provider/services/discovery-url.service.ts` | `DiscoveryUrlService.batchEnqueue` | `Order 5, 18` | `npm test -- src/modules/data-provider/_tests/discovery-url.service.spec.ts` |
| **25** | `[x]` | `[NEW]` | `src/modules/data-provider/controllers/discovery-session.controller.ts` | `DiscoverySessionController` | `Order 22, 23, 24` | `npm run build` |
| **26** | `[x]` | `[NEW]` | `src/modules/data-provider/controllers/discovery-url.controller.ts` | `DiscoveryUrlController` | `Order 23, 24` | `npm run build` |
| **27** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.profile.ts` | `DataProviderProfile` mapping Discovery & Validation entities | `Order 4, 5, 6, 9, 10, 11` | `npm run build` |
| **28** | `[x]` | `[MODIFY]` | `src/modules/data-provider/data-provider.module.ts` | `DataProviderModule` registration | `Order 22, 23, 24, 25, 26, 27` | `npm run build` |
| **29** | `[x]` | `[NEW]` | `src/modules/data-provider/_tests/price-detector.helper.spec.ts` | `PriceDetectorHelper unit tests` | `Order 19` | `npm test -- src/modules/data-provider/_tests/price-detector.helper.spec.ts` |
| **30** | `[x]` | `[NEW]` | `src/modules/data-provider/_tests/discovery-validation.helper.spec.ts` | `DiscoveryValidationHelper unit tests` | `Order 20` | `npm test -- src/modules/data-provider/_tests/discovery-validation.helper.spec.ts` |
| **31** | `[x]` | `[NEW]` | `src/modules/data-provider/_tests/discovery-validation.service.spec.ts` | `DiscoveryValidationService unit tests` | `Order 23` | `npm test -- src/modules/data-provider/_tests/discovery-validation.service.spec.ts` |
| **32** | `[x]` | `[NEW]` | `src/modules/data-provider/_tests/discovery-session.service.spec.ts` | `DiscoverySessionService unit tests` | `Order 22` | `npm test -- src/modules/data-provider/_tests/discovery-session.service.spec.ts` |
| **33** | `[x]` | `[NEW]` | `src/modules/data-provider/_tests/discovery-url.service.spec.ts` | `DiscoveryUrlService unit tests` | `Order 24` | `npm test -- src/modules/data-provider/_tests/discovery-url.service.spec.ts` |


---

## Section 4. Implementation Code Examples (Mẫu Code Triển khai)

### 4.1 Price Detector Helper (`src/modules/data-provider/helpers/price-detector.helper.ts`)
```typescript
// [TARGET SEAM]: PriceDetectorHelper
// [RATIONALE]: Kế thừa từ Orien-Trade detect-price.helper.ts để tự động bóc tách số tiền và ký hiệu tiền tệ từ HTML text.
export interface DetectedPriceResult {
    priceDetected: boolean;
    detectedPrice?: number;
    detectedCurrency?: string;
}

export class PriceDetectorHelper {
    private static readonly PRICE_REGEX = /(?:[\$€£₫¥₹]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)|\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*([\$€£₫¥₹]|USD|EUR|VND|GBP|JPY))/i;

    public static detectPriceInText(text?: string): DetectedPriceResult {
        if (!text) return { priceDetected: false };
        const match = text.match(this.PRICE_REGEX);
        if (!match) return { priceDetected: false };

        const rawPrice = match[1] || match[2];
        const rawCurrency = match[3] || text.match(/[\$€£₫¥₹]|USD|EUR|VND/i)?.[0] || '$';

        const cleanNumber = parseFloat(rawPrice.replace(/,/g, ''));
        if (isNaN(cleanNumber) || cleanNumber <= 0) return { priceDetected: false };

        return {
            priceDetected: true,
            detectedPrice: cleanNumber,
            detectedCurrency: rawCurrency.toUpperCase(),
        };
    }
}
```

### 4.2 Discovery Validation Helper (`src/modules/data-provider/helpers/discovery-validation.helper.ts`)
```typescript
// [TARGET SEAM]: DiscoveryValidationHelper.evaluateUrl
// [RATIONALE]: Thuật toán xác định (Deterministic Heuristics) kết hợp PDP Path Detection, Price Extraction và Fuzzy Similarity.
import { PriceDetectorHelper } from './price-detector.helper';
import { PDP_POSITIVE_KEYWORDS, PDP_NEGATIVE_KEYWORDS } from '../constants/discovery-constants';
import { ValidationMatchResult } from '../enums';

export interface ValidationEvaluationResult {
    confidenceScore: number;
    matchResult: ValidationMatchResult;
    reason: string;
    matchedCriteria: Record<string, any>;
    priceDetected: boolean;
    detectedPrice?: number;
    detectedCurrency?: string;
}

export class DiscoveryValidationHelper {
    public static evaluateUrl(params: {
        url: string;
        title?: string;
        targetKeyword?: string;
        domain?: string;
    }): ValidationEvaluationResult {
        const { url, title, targetKeyword } = params;
        const normalizedUrl = url.toLowerCase();
        let pathScore = 0;
        let negativeHit = false;

        // 1. Negative Filter Check
        for (const neg of PDP_NEGATIVE_KEYWORDS) {
            if (normalizedUrl.includes(neg)) {
                negativeHit = true;
                break;
            }
        }

        // 2. Positive PDP Path Check
        for (const pos of PDP_POSITIVE_KEYWORDS) {
            if (normalizedUrl.includes(pos)) {
                pathScore = 0.4;
                break;
            }
        }
        if (negativeHit) pathScore = Math.max(0, pathScore - 0.3);

        // 3. Price & Currency Detection from title
        const priceInfo = PriceDetectorHelper.detectPriceInText(title);
        const priceScore = priceInfo.priceDetected ? 0.2 : 0.0;

        // 4. Token Overlap / Similarity
        let similarityScore = 0.2; // Baseline for same-domain URL
        if (targetKeyword && title) {
            const targetTokens = targetKeyword.toLowerCase().split(/\s+/);
            const matchedTokens = targetTokens.filter((t) => title.toLowerCase().includes(t));
            similarityScore = (matchedTokens.length / targetTokens.length) * 0.4;
        }

        const totalScore = Math.min(1.0, parseFloat((pathScore + priceScore + similarityScore).toFixed(2)));

        let matchResult = ValidationMatchResult.NO_MATCH;
        if (totalScore >= 0.75) matchResult = ValidationMatchResult.EXACT_MATCH;
        else if (totalScore >= 0.45) matchResult = ValidationMatchResult.PARTIAL_MATCH;
        else matchResult = ValidationMatchResult.NO_MATCH;

        return {
            confidenceScore: totalScore,
            matchResult,
            reason: `Heuristic: PDP=${pathScore > 0}, Negative=${negativeHit}, Price=${priceInfo.priceDetected}, Similarity=${similarityScore}`,
            matchedCriteria: { pathScore, priceScore, similarityScore, negativeHit },
            priceDetected: priceInfo.priceDetected,
            detectedPrice: priceInfo.detectedPrice,
            detectedCurrency: priceInfo.detectedCurrency,
        };
    }
}
```

### 4.3 Discovery Validation Service (`src/modules/data-provider/services/discovery-validation.service.ts`)
```typescript
// [TARGET SEAM]: DiscoveryValidationService.processBatchValidation & submitUserAction
// [RATIONALE]: Quản lý đợt validate, lưu log kiểm toán và quy trình user review duyệt/từ chối URL.
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryValidationBatchEntity } from '../entities/discovery-validation-batch.entity';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';
import {
    DiscoveryValidationStatus,
    FinalValidationStatus,
    ValidationBatchStatus,
    ValidationMatchResult,
    ValidationUserAction,
} from '../enums';

@Injectable()
export class DiscoveryValidationService {
    constructor(
        @InjectRepository(DiscoveryUrlEntity)
        private readonly urlRepo: Repository<DiscoveryUrlEntity>,
        @InjectRepository(DiscoveryValidationBatchEntity)
        private readonly batchRepo: Repository<DiscoveryValidationBatchEntity>,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly logRepo: Repository<DiscoveryValidationLogEntity>,
        @InjectRepository(DiscoverySessionEntity)
        private readonly sessionRepo: Repository<DiscoverySessionEntity>,
        private readonly dataSource: DataSource,
    ) {}

    async startBatchValidation(sessionId: string): Promise<DiscoveryValidationBatchEntity> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId }, relations: ['dataProvider'] });
        if (!session) throw new NotFoundException('Session not found');

        const urls = await this.urlRepo.find({ where: { sessionId } });
        const batchNumber = `BATCH-${Date.now()}`;

        const batch = this.batchRepo.create({
            sessionId,
            batchNumber,
            status: ValidationBatchStatus.PROCESSING,
            totalUrls: urls.length,
            startedAt: new Date(),
        });
        await this.batchRepo.save(batch);

        // Run validation processing asynchronously or in-memory
        let matchedCount = 0;
        let noMatchCount = 0;
        const logEntries: DiscoveryValidationLogEntity[] = [];

        for (const urlEntity of urls) {
            const start = Date.now();
            const evalResult = DiscoveryValidationHelper.evaluateUrl({
                url: urlEntity.url,
                title: urlEntity.title,
                domain: urlEntity.domain,
            });

            urlEntity.confidenceScore = evalResult.confidenceScore;
            urlEntity.matchResult = evalResult.matchResult;
            urlEntity.validationStatus = DiscoveryValidationStatus.COMPLETED;
            urlEntity.priceDetected = evalResult.priceDetected;
            urlEntity.detectedPrice = evalResult.detectedPrice;
            urlEntity.detectedCurrency = evalResult.detectedCurrency;

            if (evalResult.matchResult === ValidationMatchResult.EXACT_MATCH) matchedCount++;
            else noMatchCount++;

            logEntries.push(
                this.logRepo.create({
                    sessionId,
                    discoveryUrlId: urlEntity.id,
                    validationBatchId: batch.id,
                    operationStatus: 'completed',
                    matchResult: evalResult.matchResult,
                    confidenceScore: evalResult.confidenceScore,
                    reason: evalResult.reason,
                    matchedCriteria: evalResult.matchedCriteria,
                    processingDuration: Date.now() - start,
                    isLatestLog: true,
                }),
            );
        }

        await this.dataSource.transaction(async (manager) => {
            await manager.save(DiscoveryUrlEntity, urls);
            await manager.save(DiscoveryValidationLogEntity, logEntries);
            await manager.update(DiscoveryValidationBatchEntity, batch.id, {
                status: ValidationBatchStatus.COMPLETED,
                processedUrls: urls.length,
                matchedUrls: matchedCount,
                noMatchUrls: noMatchCount,
                completedAt: new Date(),
            });
            await manager.update(DiscoverySessionEntity, sessionId, {
                totalValidated: urls.length,
            });
        });

        return batch;
    }

    async submitUserAction(urlId: string, action: ValidationUserAction, reason?: string): Promise<boolean> {
        const finalStatus =
            action === ValidationUserAction.CONFIRM ? FinalValidationStatus.APPROVED : FinalValidationStatus.REJECTED;

        await this.urlRepo.update(urlId, {
            userAction: action,
            userActionDate: new Date(),
            userActionReason: reason,
            finalValidationStatus: finalStatus,
        });
        return true;
    }
}
```

---

## Section 5. Test Cases (Kịch bản Kiểm thử & Nghiệm thu)

### 5.1 Test Matrix
- **Test Case 1: PriceDetectorHelper parsing formats**
  - *Objective*: Nhận diện chính xác giá `$19.99`, `1.200.000 ₫`, `€45.50` từ title chuỗi.
  - *Fast Command*: `npm test -- src/modules/data-provider/_tests/price-detector.helper.spec.ts`

- **Test Case 2: DiscoveryValidationHelper Heuristic Scoring**
  - *Objective*: Cho điểm >= 0.75 (EXACT_MATCH) với URL có `/dp/B08N5WRWNW` và có giá; điểm < 0.45 (NO_MATCH) với `/category/electronics`.
  - *Fast Command*: `npm test -- src/modules/data-provider/_tests/discovery-validation.helper.spec.ts`

- **Test Case 3: Batch Validation Execution & Audit Logs**
  - *Objective*: Chạy batch validate 10 URLs, cập nhật `DiscoveryValidationBatchEntity.status = COMPLETED`, lưu 10 bản ghi `DiscoveryValidationLogEntity`.
  - *Fast Command*: `npm test -- src/modules/data-provider/_tests/discovery-validation.service.spec.ts`

- **Test Case 4: User Action Review & Final Approval**
  - *Objective*: User gọi `submitUserAction` với `CONFIRM`, URL chuyển sang `finalValidationStatus = APPROVED`.
  - *Fast Command*: `npm test -- src/modules/data-provider/_tests/discovery-validation.service.spec.ts`

- **Toàn bộ Test Suite**:
  ```bash
  npm test -- src/modules/data-provider/_tests/price-detector.helper.spec.ts
  npm test -- src/modules/data-provider/_tests/discovery-validation.helper.spec.ts
  npm test -- src/modules/data-provider/_tests/discovery-validation.service.spec.ts
  npm test -- src/modules/data-provider/_tests/discovery-session.service.spec.ts
  npm test -- src/modules/data-provider/_tests/discovery-url.service.spec.ts
  npm run build
  npm run lint
  ```

---

## Section 6. Technical English Key Patterns

### 1. Deterministic Heuristic Scoring Pipeline
- **Meaning (VI)**: Đường ống chấm điểm dựa trên luật và thuật toán xác định thay vì AI không xác định.
- **Grammar / Usage**: `Employ a deterministic heuristic pipeline to categorize candidate URLs without introducing external LLM latency.`
- **Engineering Example**: *"We employ a deterministic heuristic pipeline to classify candidate URLs with sub-second turnaround."*

### 2. Multi-Tier Audit & Validation Logs
- **Meaning (VI)**: Hệ thống ghi vết kiểm toán nhiều tầng theo dõi chi tiết từng tiêu chí so khớp và điểm số.
- **Grammar / Usage**: `Maintain an immutable audit trail capturing granular match criteria and processing metrics per batch run.`
- **Engineering Example**: *"The validation engine writes immutable audit logs containing granular path and price scores for compliance tracking."*

### 3. Decoupled Strategy Plug-in Seam
- **Meaning (VI)**: Khớp nối kiến trúc tách rời cho phép tích hợp linh hoạt các chiến lược đánh giá khác nhau.
- **Grammar / Usage**: `Abstract the validation runner behind a plug-in strategy seam to allow future LLM integrations with zero schema changes.`
- **Engineering Example**: *"We abstracted the heuristic evaluator behind a strategy seam so we can plug in generative AI models seamlessly down the road."*
