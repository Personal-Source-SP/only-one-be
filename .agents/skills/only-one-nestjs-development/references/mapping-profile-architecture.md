# Mapping Profile Architecture

## Responsibilities & Location

AutoMapper Profiles register centralized mapping configurations between Request DTOs, Entities, and Response DTOs. The Profile defines **data shaping**, while the Service dictates **which relations to populate**.

- **Location**: `src/modules/<feature>/profiles/<feature>.profile.ts`

## Code Example

```ts
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { createMap, forMember, mapFrom, mapWith, Mapper, MappingProfile } from '@automapper/core';
import { wrap } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  get profile(): MappingProfile {
    return (mapper) => {
      createMap(
        mapper,
        FeatureEntity,
        FeatureDto,
        forMember(
          (dest) => dest.owner,
          mapWith(OwnerDto, OwnerEntity, (src) =>
            src.owner && wrap(src.owner).isInitialized() ? src.owner : null,
          ),
        ),
        forMember(
          (dest) => dest.items,
          mapWith(ItemDto, ItemEntity, (src) =>
            src.items?.isInitialized() ? src.items.getItems() : [],
          ),
        ),
      );

      createMap(mapper, CreateFeatureRequest, FeatureEntity);
      createMap(mapper, UpdateFeatureRequest, FeatureEntity);
    };
  }
}
```

## Guidelines & Rules

- ✅ **Module Registration**: Profiles must be decorated with `@Injectable()`, extend `AutomapperProfile`, and be registered in the `providers` array of the feature module.
- ✅ **Safe Relation Mapping (Uninitialized Guards for MikroORM)**:
  - Relations not explicitly loaded via `populate` remain uninitialized in MikroORM. Guard all relation mappings to prevent serialization crashes or accidental N+1 queries:
    - **Single Relation**: Use `mapWith()`, verifying `wrap(relation).isInitialized()`. Return `null` if uninitialized.
    - **Collection Relation**: Verify `collection.isInitialized()`. Return `[]` if uninitialized.
- ✅ **Computed Fields**: Use `forMember` paired with `mapFrom`. Compute values strictly from in-memory properties already present on the source object.
- ✅ **Registration Order**: Register nested model mappings before parent mappings if the parent mapping references child DTOs.
- ❌ **No Business Logic or Database Queries**: Never perform database queries, external HTTP requests, or validation inside a mapping profile.
- ❌ **No Accidental Lazy Loading**: Never access uninitialized relation properties directly without guard checks, preventing unintended N+1 queries or runtime ORM exceptions.
