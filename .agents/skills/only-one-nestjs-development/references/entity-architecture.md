# Entity Architecture (MikroORM)

## Responsibilities & Location

Entities map domain persistence models to database tables, columns, indexes, and relations.

> [!NOTE]
> Entity guidelines in this document focus specifically on **MikroORM** (using decorators and types from `@mikro-orm/core` such as `@Entity`, `@Property`, `@ManyToOne`, `@OneToMany`, `Collection`, etc.).

- **Location**: `src/modules/<feature>/entities/<noun>.entity.ts`

## Code Example

```ts
import { AutoMap } from '@automapper/classes';
import { Collection, Entity, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/core';
import { AbstractEntity } from '@/common/abstract.entity';

@Entity({ tableName: 'features' })
@Unique({ properties: ['code'], options: { cond: { deletedAt: null } } })
export class FeatureEntity extends AbstractEntity {
  @Property({ length: 100 })
  @AutoMap()
  code!: string;

  @Property({ default: true })
  @AutoMap()
  enabled = true;

  // ManyToOne (Owning Side): Stores FK category_id in the features table
  @ManyToOne(() => CategoryEntity, { nullable: true, deleteRule: 'set null' })
  category?: CategoryEntity;

  @AutoMap()
  get categoryId(): string | undefined {
    return this.category?.id;
  }

  // OneToMany (Inverse Side): Collection of items belonging to this feature
  @OneToMany(() => FeatureItemEntity, (item) => item.feature, {
    orphanRemoval: true,
  })
  items = new Collection<FeatureItemEntity>(this);
}
```

## Guidelines & Rules

- ✅ **Inheritance & Naming Conventions**:
  - Extend `AbstractEntity` (providing UUID primary key, audit timestamps, and soft-delete filters).
  - Use `PascalCase` for entity class names (`FeatureEntity`), `camelCase` for property names, and `snake_case` for database table/column names.
  - Entity names must reflect the Ubiquitous Language of the domain context; avoid generic names like `DataEntity` or `ItemEntity`.
- ✅ **Property Ordering**: Required scalar fields -> Nullable scalar fields -> Relations.
- ✅ **Data Types & Constraints**:
  - Explicitly declare `length` for every `string` column (e.g., code `length: 100`, name `length: 255`). Use `type: 'text'` for unbounded string content.
  - Define database-level unique constraints and partial indexes for race-condition-sensitive columns.
- ✅ **AutoMapper Decorators**:
  - Annotate `@AutoMap()` on scalar properties that map to DTOs.
  - By default, do **not** annotate relations with `@AutoMap()`.
  - For `ManyToOne` relations: Provide a getter for the foreign key ID decorated with `@AutoMap()` (e.g., `@AutoMap() get categoryId(): string | undefined { return this.category?.id; }`).
  - For `OneToMany` collections: Annotate `@AutoMap(() => [ChildDto])` only when the API contract explicitly mandates serialized nested items.
- ✅ **Relation Invariants**:
  - **`ManyToOne` (Owning Side)**: Current table stores the foreign key column. Specify appropriate `deleteRule` (`cascade`, `set null`, or `restrict`).
  - **`OneToMany` (Inverse Side)**:
    - Always initialize collections with `new Collection<ChildEntity>(this)`.
    - Explicitly map to the reciprocal `ManyToOne` property: `@OneToMany(() => ChildEntity, (child) => child.parent)`.
    - Set `orphanRemoval: true` when child entities have no independent lifecycle and must be deleted when removed from the collection.
    - In Services / Mapping Profiles: Always verify `collection.isInitialized()` prior to calling `.getItems()` to avoid uninitialized lazy-loading pitfalls or N+1 query loops.
  - **`ManyToMany`**: Use only when the junction table contains no business attributes. If the join table requires attributes (e.g., `createdAt`, `status`, `sortOrder`), model it as a dedicated join entity with two `ManyToOne` relations.
  - **`OneToOne`**: Use only when the domain strictly enforces a single associated record. The owning side must declare `owner: true` to maintain a unique foreign key constraint.
- ❌ **No Responsibility Bleed**: Never expose entities as request/response DTOs, and never place controller/service HTTP logic inside entities.
- ❌ **Do Not Omit Database Constraints**: Never bypass DB-level Unique/Index constraints under the assumption that service layer validation is sufficient.
