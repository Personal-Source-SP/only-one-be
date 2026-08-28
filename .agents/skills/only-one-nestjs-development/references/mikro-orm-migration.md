# MikroORM Migration Reference

## Responsibilities & Location

Provides explicit procedures for generating, reviewing, and executing Database Migrations via the MikroORM CLI whenever Entity models or DB schemas change.

> [!CAUTION]
> **CRITICAL AGENT RESTRICTION**:
> The Agent **MUST NEVER AUTOMATICALLY EXECUTE MIGRATIONS** on the database (i.e., commands like `migration:run`, `migration:up`, `migration:revert`, `migration:down` or direct database schema mutations).
> - **Agent Responsibility**: Update Entity definitions, generate new migration files (`migration:create`), and review the generated SQL/TypeScript statements.
> - **Human User Responsibility**: Manually execute migration commands (`migration:run` / `migration:revert`) in their local terminal after reviewing the generated script.

- **Migration Directory**: `src/database/migrations/`
- **Generated File Format**: `Migration<YYYYMMDDHHMMSS>_<PascalCaseName>.ts`

## 5-Step Migration Lifecycle

### 1. Update or Create Entity (Agent Task)
Update the entity file (`src/modules/<feature>/entities/<noun>.entity.ts`) ensuring complete definitions:
- Decorators: `@Entity()`, `@Property({ length: ... })`, `@Unique()`, etc.
- Precise data types, default values, nullable flags, and foreign key relations.

### 2. Generate Migration File (Agent Task)
Run the CLI command allowing MikroORM to diff the entity definitions against the current database schema:
```bash
npm run migration:create -- --name=AddAds
```
*(Or `npx mikro-orm migration:create --name=AddAdsMediaKey`)*

> **Migration Naming Convention (`--name`)**:
> Always specify names in **`PascalCase`** following project standards:
> - **New Table:** `Add<EntityPlural>` (e.g., `AddBanners`, `AddVehicles`, `AddNotificationTemplates`)
> - **New Column:** `Add<Entity><ColumnName>` (e.g., `AddStationContactPhone`, `AddWashModeFeaturesColumn`, `AddPaymentTransactionExpires`)
> - **Table/Column Update:** `Update<Entity><Detail>` (e.g., `UpdateAuditLogs`, `UpdateOrdersVehicle`)
> - **Rename:** `Rename<OldName>To<NewName>` (e.g., `RenameCarModelsToVehicleModels`, `RenameVehiclesToUserVehicles`)
> - **Replace/Refactor:** `Replace<Detail>` (e.g., `ReplaceGatewayPaymentMethod`)
> - ❌ **NEVER** use vague or generic names like `update`, `migration1`, `temp`, or `fix`.

### 3. Review Generated Migration File (Agent & User Task)
After the migration file is created in `src/database/migrations/`:
- **MUST** inspect the file (`view_file`) to audit raw SQL statements in both `up()` and `down()`.
- Verify column names, data types, string lengths (`varchar(length)`), indexes, unique constraints, and foreign key cascades.
- Confirm full reversibility: `down()` must contain exact reverse statements undoing all `up()` changes.

### 4. Execute Migration (HUMAN USER MANUAL STEP)
The user reviews the generated script and executes the migration:
```bash
npm run migration:run
```
*(Or `npx mikro-orm migration:up`)*

### 5. Rollback Migration (HUMAN USER MANUAL STEP IF NEEDED)
If a rollback is required:
```bash
npm run migration:revert
```
*(Or `npx mikro-orm migration:down`)*

---

## Guidelines & Rules

- ❌ **NO AUTOMATIC MIGRATION EXECUTION BY AGENT**: The Agent must never run `npm run migration:run` or `npm run migration:revert`. All migration runs must remain under human control.
- ✅ **Standard PascalCase Naming**: Always supply `--name=<PascalCaseName>` following established naming patterns (`AddBanners`, `AddStationContactPhone`, `UpdateOrdersVehicle`, `RenameCarModelsToVehicleModels`).
- ✅ **Mandatory File Audit**: The Agent must open and verify the generated migration script's `up()` and `down()` blocks before notifying the user.
- ✅ **Return-by-Variable**: When writing custom manual migration logic in TypeScript, assign intermediate query results to descriptive variables before returning.
- ✅ **Partial Unique Indexes for Soft Delete**: For entities with soft-delete support, unique indexes must be defined as partial unique indexes with `WHERE deleted_at IS NULL`.
- ❌ **Avoid Destructive Production Schema Changes**:
  - Never generate unannounced `DROP TABLE` or `DROP COLUMN` statements against tables containing production data without an explicit deprecation plan.
  - When renaming columns, prefer the expand-contract pattern: add new column -> backfill data -> remove old column.
- ❌ **Never Mutate Committed Migrations**: Never modify an existing migration file that has been committed or run in shared/production environments. Create a new migration file for subsequent schema alterations.
