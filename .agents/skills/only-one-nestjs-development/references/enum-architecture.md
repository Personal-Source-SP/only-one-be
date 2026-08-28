# Enum Architecture

## Responsibilities & Location

Enums represent finite, immutable domain states and sets of values reused across Entities, DTOs, and Services.

- **Location**: `src/modules/<feature>/enums/<domain>.enum.ts`

## Code Example

```ts
export enum FeatureStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

## Guidelines & Rules

- ✅ **Type-Safe Enums**:
  - Declare string enums with explicit, stable string values.
  - Reference enum types directly across entities and services to eliminate magic strings.
  - In DTOs, validate enums using `@EnumField(() => FeatureStatus)` or `@EnumFieldOptional(() => FeatureStatus)`.
- ❌ **No Business Logic or Dynamic Data**:
  - Never embed I/O, database queries, or transformation logic inside enums.
  - Do not use enums for dynamic datasets managed at runtime by users or administrators (model dynamic datasets as lookup tables / database entities instead).
