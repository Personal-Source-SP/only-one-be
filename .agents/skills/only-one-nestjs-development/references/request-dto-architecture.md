# Request DTO Architecture

## Responsibilities & Location

Request DTOs define input data contracts and validation rules at the HTTP boundary.

- **Location**: `src/modules/<feature>/dtos/requests/`

## Code Example

```ts
import { AutoMap } from '@automapper/classes';
import { BooleanFieldOptional, StringField, StringFieldOptional, Trim } from '@/common/decorators';

export class CreateFeatureRequest {
  @AutoMap()
  @StringField({ minLength: 1, maxLength: 255 })
  @Trim()
  name!: string;

  @AutoMap()
  @BooleanFieldOptional()
  enabled?: boolean;
}

export class UpdateFeatureRequest {
  @AutoMap()
  @StringFieldOptional({ minLength: 1, maxLength: 255 })
  @Trim()
  name?: string;
}
```

## Guidelines & Rules

- ✅ **Segregated Contracts**: Separate DTOs cleanly for `Create`, `Update`, and `Query/List` operations.
- ✅ **Validation Decorators**:
  - Prioritize project-standard decorator wrappers: `@StringField`, `@StringFieldOptional`, `@NumberFieldOptional`, `@BooleanFieldOptional`, `@EnumFieldOptional`, `@DateFieldOptional`, `@Trim`.
  - Ensure string inputs include `@Trim()` and explicit `minLength`/`maxLength` bounds.
  - Use raw `class-validator` decorators only for advanced constraints not covered by project wrappers (e.g., `@ArrayMinSize`, `@ArrayUnique`).
- ✅ **Property Ordering**: Group all **Required fields** first -> followed by **Optional fields**. Do not interleave optional fields among required fields.
- ✅ **AutoMapper Binding**: Annotate `@AutoMap()` on fields in `Create`/`Update` DTOs destined to map onto entities. Query/List filter DTOs do not map directly to entities and should omit `@AutoMap()`.
- ❌ **No Domain/Database Coupling**:
  - Never import Entities, Repositories, or Services into DTO definitions.
  - Never place database-state-dependent validations inside DTOs (dynamic DB validations belong in Services).
  - Never accept raw database entities as HTTP request payloads.
