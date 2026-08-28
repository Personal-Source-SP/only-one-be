# Helper Architecture

## Responsibilities & Location

Helpers contain stateless, pure utility functions decoupled from Dependency Injection, handling deterministic data transformations (formatting, parsing, sanitizing, and normalizing).

- **Location**: `src/modules/<feature>/helpers/`

## Code Example

```ts
export const normalizeCode = (value?: string): string | undefined => {
  const normalized = value?.trim().toUpperCase();
  const result = normalized || undefined;
  return result;
};
```

## Guidelines & Rules

- ✅ **Pure Functions & Utility Scope**:
  - Deterministic input/output with zero external side effects.
  - Dedicated strictly to low-level transformations: string formatting, data parsing, payload sanitization, or standalone format validation.
  - For date/time arithmetic and comparison, use **`dayjs`** (`dayjs.isBefore`, `dayjs.isAfter`, `dayjs.diff` rather than native `Date` operator comparisons). When handling specific timezones or UTC conversions, ensure timezone plugins (`dayjs.extend(utc)`, `dayjs.extend(timezone)`) are configured.
  - Leverage standard **`lodash`** utility functions (`isEmpty`, `get`, `set`, `uniq`, `groupBy`, `keyBy`, `cloneDeep`, `omit`, `pick`) instead of re-implementing manual iterations or transformations.
  - Use structured `switch/case` statements when branching on Enum or union discriminator types.
  - **Return-by-Variable Convention**: ALWAYS assign computation results to descriptive variables before returning (`const result = ...; return result;`); avoid complex nested inline return expressions to facilitate breakpoint debugging.
  - Every helper must be accompanied by comprehensive unit tests in `helpers/_tests/`.
- ❌ **No Business Logic or Dependency Injection**:
  - Never inject Repositories, `EntityManager`, Controllers, or Request Context into helper functions.
  - Do not place domain business logic (pricing calculation, permissions, workflow transitions) in helpers — domain logic strictly belongs in Services.
  - Avoid creating separate helper files for trivial private functions used in only a single place within a service.
