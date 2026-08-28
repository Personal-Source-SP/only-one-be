# MikroORM Reference

## Responsibilities & Location

Establishes core guidelines and best practices for integrating **MikroORM** within NestJS for the persistence layer, entity management, and transaction boundaries.

- **Location**: Used across `Service`, `Entity`, and `Profile` files in `src/modules/<feature>/`

## Guidelines & Rules

- ✅ **Module Declaration & Injection**:
  - Register entities with `MikroOrmModule.forFeature([FeatureEntity])` in the `imports` array of the feature module.
  - Inject repositories using `@InjectRepository(FeatureEntity)` and the entity manager via constructor injection (`_em: EntityManager`).
- ✅ **Leverage BaseService CRUD Operations**:
  - Prioritize standard helper methods provided by `BaseService` (`findById`, `createEntity`, `updatePartial`, `deleteEntity`, `findAll`, `findOneByFilter`, `exists`, `count`, `paginate`).
  - Avoid invoking low-level `_em.findOne`, `_em.find`, `_em.create`, `_em.persist`, or `_em.flush` for standard CRUD actions unless implementing bespoke, low-level persistence workflows.
- ✅ **Transactional Integrity (Atomicity)**:
  - Multi-write operations requiring strict atomicity must be encapsulated within a transaction: `await this._em.transactional(async (em) => { ... })`.
  - Keep transaction lifespans as short as possible. Never execute third-party API calls, slow I/O, or asynchronous network requests inside transaction blocks.
- ✅ **Uninitialized Relation Guards**:
  - Relations not explicitly loaded with `populate` remain uninitialized in MikroORM.
  - Verify `wrap(relation).isInitialized()` for single relations or `collection.isInitialized()` for collections before accessing child properties or mapping to DTOs to avoid accidental lazy-loading exceptions or N+1 queries.
- ✅ **Exception Translation**:
  - Catch ORM constraint violations (`UniqueConstraintViolationException`) and missing entities, translating them to appropriate domain `AppError` exceptions.
  - Never allow raw database or ORM exceptions to leak directly to the HTTP response.
