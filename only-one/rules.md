# Repository Rules & Constraints

## Architecture & Data Modeling
- **[AVOID]** Hierarchical parent-child coupling on data providers (`parentId`, `parent`, `children`) — Maintain DataProvider as flat, independent entities with explicit, self-contained identity (`identifier`, `baseUrl`) and configurations.
- **[NEVER]** Implicitly inherit configurations or fall back to parent entity fields across services — Require explicit configuration per provider/feature to prevent hidden mutation bugs and cascading failures.
- **[AVOID]** Storing polymorphic feature configurations, execution metrics, and statuses directly on core domain tables (`data_providers`) — Decouple capabilities into 1-to-N relation `DataProviderFeatureEntity` (`data_provider_features`) with dedicated lifecycle statuses and polymorphic `config: jsonb`.
- **[AVOID]** Monolithic entity versioning — Anchor configuration version snapshots (`ConfigVersionEntity`) to specific feature IDs (`featureId`) rather than root entities, ensuring granular rollback capability per feature.
- **[AVOID]** Storing configuration rollback snapshots without synchronizing active feature entity config — Whenever a rollback snapshot is persisted, the active feature entity `config` column must be atomically updated in the same database transaction.

## Service & Controller Patterns
- **[NEVER]** Scatter ad-hoc testing endpoints across different resource controllers — Route feature testing through standardized endpoints (`POST /data-provider-features/test` for stateless sandbox and `POST /data-provider-features/:id/test` for contextual test) handled dynamically by the `IFeatureRunner` strategy registry.
- **[NEVER]** Save task lifecycle documents outside of the active workspace's task directory — Always store `concept.md`, `plan.md`, and `walkthrough.md` directly under `<workspace>/only-one/tasks/<task-folder>`.
