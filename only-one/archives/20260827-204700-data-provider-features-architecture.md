---
id: 20260827-204700-data-provider-features-architecture
title: Flat Data Provider Entity & Decoupled Pluggable Features Architecture
archived_at: 2026-08-27
status: active
references: []
affected_modules:
  - modules/data-provider
  - migrations
---

# Archive: Flat Data Provider Entity & Decoupled Pluggable Features Architecture

## 1. Problem & Core Value
- **Problem**: Previously, `DataProviderEntity` had a self-referencing parent-child hierarchy (`parentId`) causing circular dependencies and implicit configuration fallback. Additionally, scraping and search configurations and execution metrics were coupled directly inside `data_providers`, causing monolithic schema bloat, lack of independent feature lifecycles, and fragmented testing endpoints.
- **Value**: Transformed `DataProvider` into a flat, independent entity with explicit identity, and decoupled capabilities into a dedicated 1-to-N `DataProviderFeatureEntity` with independent lifecycle statuses, isolated versioning per feature (`ConfigVersionEntity`), and unified strategy-driven test runners.

## 2. Key Architecture & Decisions
- **Flat Entity Architecture**: Dropped `parent_id` foreign key and column, removing fallback logic in services so each provider explicitly defines its identity and base URL.
- **Pluggable Feature Entity**: Created `DataProviderFeatureEntity` (`data_provider_features`) with composite unique index on `(dataProviderId, type)` and polymorphic `config: jsonb`.
- **Isolated Feature Versioning**: Re-anchored `ConfigVersionEntity` to `featureId`, providing rollback snapshots, total/active version count metrics, and changelog history per feature.
- **Dedicated RESTful Controller**: Centralized feature operations under `@Controller('data-provider-features')`.
- **Strategy Testing Registry**: Implemented `IFeatureRunner` with `ScrapingFeatureRunner` and `DiscoveryRunner` registered in `FeatureRunnerRegistry` supporting dual-mode testing (`POST /test` stateless and `POST /:id/test` contextual).

```mermaid
flowchart TD
    DataProvider[DataProviderEntity (Flat & Independent)] -->|1 : N| Features[DataProviderFeatureEntity]
    Features -->|1 : N| ConfigVersion[ConfigVersionEntity (featureId scoped)]
    Controller[DataProviderFeatureController] --> Registry[FeatureRunnerRegistry]
    Registry --> ScrapingRunner[ScrapingFeatureRunner]
    Registry --> DiscoveryRunner[DiscoveryRunner]
    Controller --> FeatureService[DataProviderFeatureService]
    Controller --> VersionService[ConfigVersionService]
```

## 3. Scope & Key Changes
- [`src/modules/data-provider/entities/data-provider.entity.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider.entity.ts): Flat provider entity schema without parent-child relation.
- [`src/modules/data-provider/entities/data-provider-feature.entity.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider-feature.entity.ts): Pluggable feature entity with polymorphic JSONB config and status lifecycle.
- [`src/modules/data-provider/entities/config-version.entity.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/config-version.entity.ts): Version history snapshot entity anchored to `featureId`.
- [`src/modules/data-provider/controllers/data-provider-feature.controller.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/controllers/data-provider-feature.controller.ts): RESTful feature management, version rollback, and test execution API.
- [`src/modules/data-provider/services/data-provider-feature.service.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-feature.service.ts): Feature lifecycle, status toggling, and metric tracking.
- [`src/modules/data-provider/services/config-version.service.ts`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/config-version.service.ts): Version creation, listing with pagination and active flags, and atomic rollback service.
- [`src/modules/data-provider/runners/`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/runners): Feature runner strategy registry (`FeatureRunnerRegistry`, `ScrapingFeatureRunner`, `DiscoveryRunner`).

## 4. Verification Evidence & PR
- **Test Status**: 100% Passed (NestJS compilation and typecheck succeeded with 0 errors).
- **PR URL**: ~
