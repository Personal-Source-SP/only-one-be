# Walkthrough: Draft Item Search Processing & Mapping Architecture

## 1. Summary of Changes

Implemented the Draft Item feature enabling batch search staging and atomic item promotion for discovered data provider products:

### 1.1 Enums & Data Structures
- [`DraftItemStatus`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/enums/draft-item-status.enum.ts): Defined status enum (`NEW`, `MATCHED`, `SIMILAR`, `MAPPED`, `IGNORED`).
- [`MapDraftItemAction`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/enums/map-draft-item-action.enum.ts): Defined mapping action enum (`CREATE_NEW`, `LINK_EXISTING`).
- Exported in [`src/modules/data-provider/enums/index.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/enums/index.ts).

### 1.2 Entities & Relations
- [`DraftItemEntity`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/draft-item.entity.ts): TypeORM entity for table `draft_items`, storing discovered items linked directly to [`DataProviderFeatureEntity`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts) (`dataProviderFeatureId`), item matching references (`suggestedItemId`, `mappedItemId`, `mappedDataProviderItemId`), and raw payload in `metadata` (JSONB).
- [`DataProviderFeatureEntity`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts): Added `@OneToMany(() => DraftItemEntity)` relation.
- [`ItemEntity`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/item.entity.ts): Added relations `suggestedDraftItems` and `mappedDraftItems`.
- **Database Migration**: Created [`1765400000000-CreateDraftItemsTable.ts`](file:///d:/Sources/Personal/only-one-be/src/migrations/1765400000000-CreateDraftItemsTable.ts) creating table `draft_items`, foreign key constraints, and performance indexes on `(data_provider_feature_id, url)`, `status`, and `code`.

### 1.3 DTOs & Serialization
- [`DraftItemDto`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/draft-item.dto.ts): Response DTO with AutoMapper annotations.
- [`MapDraftItemRequestDto` & `FilterDraftItemPaginationDto`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/draft-item-request.dto.ts): Request validation for item promotion actions (`CREATE_NEW` | `LINK_EXISTING`) and filtering.
- [`ProcessSearchDataRequestDto`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/process-search-data-request.dto.ts) & [`ProcessSearchDataResponse`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/responses/process-search-data-response.dto.ts): DTOs for batch search triggering and reporting.
- Updated barrel exports in [`dtos/requests/index.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/index.ts) and [`dtos/responses/index.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/responses/index.ts).
- Extended [`DiscoveredItemDto`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/responses/search-items-response.dto.ts) with `code?: string`.

### 1.4 Constants & Pagination
- [`DRAFT_ITEM_PAGINATION_CONFIG`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/constants/draft-item-pagination.config.ts): Multi-column search, filtering by `dataProviderFeatureId`, `status`, and sorting configuration.

### 1.5 Service & Controller
- [`DraftItemService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/draft-item.service.ts):
  - `processSearchData()`: Orchestrates batch product discovery across `READY` search features, classifies match status (`NEW`, `MATCHED`, `SIMILAR`), persists drafts, and tracks feature health.
  - `mapDraftItem()`: Atomic 2-phase database transaction creating canonical `ItemEntity` (if new) + `DataProviderItemEntity` link, and marking draft as `MAPPED`.
- [`DraftItemController`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/draft-item.controller.ts): REST endpoints for pagination, `POST /draft-items/process-search-data`, and `POST /draft-items/:id/map`.
- Registered mappings in [`DataProviderProfile`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.profile.ts).
- Registered components in [`DataProviderModule`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/data-provider.module.ts).

---

## 2. Verification Results

### Build Verification
- Executed `npm run build`:
```text
> only-one-be@0.0.1 build
> rimraf dist && tsc -p tsconfig.build.json && nest build
```
Result: **Build succeeded with 0 TypeScript/NestJS errors.**

### Unit Tests
- Created comprehensive test suite in [`src/modules/data-provider/_tests/draft-item.service.spec.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/_tests/draft-item.service.spec.ts) covering:
  - TC-01: Batch Search Execution Happy Path
  - TC-02: Status Classification for Exact Code Match
  - TC-03: Atomic Promotion (`CREATE_NEW`)
  - TC-04: Idempotency on Already Mapped Draft
  - TC-05: Atomic Promotion (`LINK_EXISTING`)

---

## 3. User Constraints & Lessons Learned

1. **Relation Target Alignment**: Discovered search results are produced by a specific feature (`DataProviderFeatureType.SEARCH`), so `DraftItemEntity` must reference `DataProviderFeatureEntity` (`dataProviderFeatureId`) rather than `DataProviderEntity` directly.
2. **Metadata Staging**: Provider-specific attributes (`price`, `currency`, `imageUrl`) are stored in `metadata` (JSONB) to keep `DraftItemEntity` decoupled and lightweight while still retaining full raw context for human review.
