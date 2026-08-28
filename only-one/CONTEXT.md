# Domain Glossary & Architecture Context

## Data Provider & Scraping Domain

### Core Concepts
- **DataProvider**: An external entity/website source from which data is scraped or collected (e.g. Amazon, Shopee, Tiki).
- **DataProviderFeature**: A decoupled, configurable capability attached to a Data Provider (e.g. Search by Keyword, Scrape Detail Page, Category Extraction) with polymorphic JSON configuration.
- **ScrapingData**: A raw data unit/job record targeted for detailed scraping pipeline execution.

### Scraping Discovery & Validation Engine
- **DiscoverySession**: A dedicated, trackable job session aimed at discovering URLs from a given `targetUrl` up to a configured `depth` and `maxUrls`.
  - **Status Lifecycle**: `pending` -> `in_progress` -> `completed` | `failed`.
  - **Key Metrics**: `totalDiscovered`, `totalQueued`, `totalValidated`, `durationSeconds`, `errorMessage`.
- **DiscoveryUrl**: An individual hyperlink/endpoint discovered during a Discovery Session.
  - **Status Lifecycle**: `discovered` -> `queued` -> `scraped` | `failed`.
  - **Validation Lifecycle**: `pending` -> `processing` -> `completed` | `failed` | `skipped`.
  - **Match Classification**: `exact_match`, `partial_match`, `no_match`, `uncertain`.
  - **User Review Status**: `pending_review`, `approved`, `rejected` (actions: `confirm`, `reject`, `exclude`).
  - **Attributes**: `url`, `domain`, `title`, `foundAtDepth`, `confidenceScore`, `priceDetected`, `detectedPrice`, `detectedCurrency`, `sessionId`, `dataProviderId`.
- **DiscoveryValidationBatch**: A batch execution unit evaluating a set of discovered URLs within a session.
  - **Status Lifecycle**: `pending` -> `processing` -> `completed` | `cancelled` | `failed`.
  - **Progress Tracking**: `totalUrls`, `processedUrls`, `matchedUrls`, `noMatchUrls`.
- **DiscoveryValidationLog**: An audit log recording the evaluation criteria, score breakdown, reasons, and execution duration per URL validation.
- **Batch Enqueue**: The transition action where validated/approved URLs are converted into `queued` status and dispatched as active `ScrapingData` jobs for downstream scraping runners.

### Deprecated / Decommissioned Concepts
- **DraftItem (Deprecated/Removed)**: Legacy intermediate buffer for scraping candidates; completely superseded by `DiscoverySession` and `DiscoveryUrl`.
- **Legacy Search Pipeline (Deprecated/Removed)**: `DataProviderSearchService`, `SearchWorkerProcessor`, `SearchScheduleService`, and `SEARCH_JOB` queue; completely consolidated into the Discovery Engine (`DiscoverySession`, `DiscoveryRunnerService`), while `DataProviderFeatureType.SEARCH` is preserved to back Discovery capabilities.


