# Repository Rules & Constraints

## Architecture & Data Modeling
- **[AVOID]** Hierarchical parent-child coupling on data providers (`parentId`, `parent`, `children`) — Maintain DataProvider as flat, independent entities with explicit, self-contained identity (`identifier`, `baseUrl`) and configurations.
- **[NEVER]** Implicitly inherit configurations or fall back to parent entity fields across services — Require explicit configuration per provider/feature to prevent hidden mutation bugs and cascading failures.
- **[AVOID]** Storing polymorphic feature configurations, execution metrics, and statuses directly on core domain tables (`data_providers`) — Decouple capabilities into 1-to-N relation `DataProviderFeatureEntity` (`data_provider_features`) with dedicated lifecycle statuses and polymorphic `config: jsonb`.
- **[AVOID]** Monolithic entity versioning — Anchor configuration version snapshots (`ConfigVersionEntity`) to specific feature IDs (`featureId`) rather than root entities, ensuring granular rollback capability per feature.
- **[AVOID]** Storing configuration rollback snapshots without synchronizing active feature entity config — Whenever a rollback snapshot is persisted, the active feature entity `config` column must be atomically updated in the same database transaction.
- **[NEVER]** Retain orphaned legacy staging tables or dead entities (`DraftItemEntity`) after replacing them with modular validation and ingestion engines.
- **[AVOID]** Coupling price extraction or detection fields directly to Discovery URL entities — Keep URL discovery strictly focused on link discovery, validation, and product resolution lifecycles.

## Service & Controller Patterns
- **[NEVER]** Scatter ad-hoc testing endpoints across different resource controllers — Route feature testing through standardized endpoints (`POST /data-provider-features/test` for stateless sandbox and `POST /data-provider-features/:id/test` for contextual test) handled dynamically by the `IFeatureRunner` strategy registry.
- **[NEVER]** Save task lifecycle documents outside of the active workspace's task directory — Always store `concept.md`, `plan.md`, and `walkthrough.md` directly under `<workspace>/only-one/tasks/<task-folder>`.
- **[NEVER]** Ingest discovery items into catalog without hierarchical entity resolution (`code` -> `name` fallback) to prevent duplicate product records.
- **[AVOID]** Non-idempotent item ingestion actions — Ensure approving or ingesting a `DiscoveryUrl` multiple times is safe and idempotent.
- **[AVOID]** Performing heavy batch URL heuristic scoring synchronously in-process on the API server — Offload batch validation jobs to background worker queues (`QUEUE_NAME.DISCOVERY_VALIDATION_JOB`) with atomic counter increments.
- **[AVOID]** Performing heavy multi-table database transactions and business entity creation directly inside worker processors — Keep worker processors as thin delegators that focus purely on queue job lifecycle, offloading domain business rules and atomic progress transactions to dedicated domain services.
- **[AVOID]** Declaring redundant boilerplate validation and Swagger decorators manually on DTOs — Use consolidated composite decorators (`@StringField`, `@NumberField`, `@EnumField`, `@UUIDField`, `@EmailField`, `@PhoneField`, `@PasswordField`) with built-in auto-trimming and schema mapping.
- **[AVOID]** Scattering `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()` separately across controller endpoints — Use the unified `@Auth()` decorator for cohesive authentication and RBAC metadata enforcement.
- **[AVOID]** Using manual `ParseUUIDPipe` on controller route params — Standardize on `@UUIDParam('id')` for route parameter validation.

## Error Handling & Exception Patterns
- **[AVOID]** Wrapping try...catch manually and calling handleError() inside Service CRUD methods — Allow exceptions to naturally bubble up to `AllExceptionsFilter` for centralized call-site logging, classification, and HTTP Status mapping.
- **[NEVER]** Leak internal stack traces, server file paths, or raw SQL queries to client responses — Log detailed context strictly on the server console/files via `LoggerService` and return standardized `ResponseDto` with sanitized `IAppError` codes and messages to clients.
- **[AVOID]** Coercing all unhandled exceptions into `BadRequestException` (HTTP 400) — Classify exceptions accurately into proper RESTful status codes (400, 401, 403, 404, 409, 500) and use `AppException` with `AppError` dictionary.

