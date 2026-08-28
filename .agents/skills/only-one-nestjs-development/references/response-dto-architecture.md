# Response DTO Architecture

## Responsibilities & Location

Response DTOs define the public output contract for API responses, handling serialization formatting and OpenAPI/Swagger documentation schemas.

- **Location**: `src/modules/<feature>/dtos/responses/` (or `dtos/<noun>.dto.ts`)

## Code Example

```ts
import { AutoMap } from '@automapper/classes';
import { AbstractDto } from '@/common/abstract.dto';
import { ClassField, StringField } from '@/common/decorators';
import { FeatureItemDto } from './feature-item.dto';

export class FeatureDto extends AbstractDto {
  @StringField({ minLength: 1, maxLength: 255 })
  @AutoMap()
  name!: string;

  @ClassField(() => FeatureItemDto, { each: true, isArray: true })
  @AutoMap(() => [FeatureItemDto])
  items!: FeatureItemDto[];

  constructor(partial?: Partial<FeatureDto>) {
    super();
    Object.assign(this, partial);
  }
}
```

## Guidelines & Rules

- ✅ **Inheritance & Constructors**:
  - Extend `AbstractDto` for response DTOs modeling domain entities with UUIDs and timestamp metadata.
  - Provide a standard constructor pattern: `constructor(partial?: Partial<FeatureDto>) { super(); Object.assign(this, partial); }`. Keep `partial` optional so AutoMapper can instantiate the DTO without constructor arguments.
- ✅ **Nested DTO Declarations**: Use `@ClassField()` or `@ClassFieldOptional()` when declaring properties representing nested DTOs.
- ❌ **No Raw Entity Leaks**: Never expose raw database entities directly in HTTP responses.
- ❌ **No Sensitive Field Leaks**: Never expose secrets, hashes, credentials, or internal audit properties unless explicitly mandated by the public contract.
- ❌ **Avoid Circular References**: Never design circular references between DTOs (e.g., `ParentDto -> ChildDto -> ParentDto`) which cause serialization stack overflows and infinite payloads.
