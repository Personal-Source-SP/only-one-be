# Walkthrough: Remove Parent-Child Hierarchy from DataProvider

Successfully removed the hierarchical parent-child (`parentId`, `parent`, `children`) model from DataProvider across the backend database, TypeORM entities, DTOs, service logic, search/scraper engines, and frontend UI components.

---

## 1. Summary of Changes

### Backend (`only-one-be`):
- **Database Migration**:
  - Created [`1765000000000-RemoveParentIdFromDataProviderTable.ts`](file:///d:/Sources/Personal/only-one-be/src/migrations/1765000000000-RemoveParentIdFromDataProviderTable.ts) to drop `FK_f75e897c7184b7a3455a4ac860a` and drop column `parent_id` from table `data_providers`.
- **Entity**:
  - Modified [`DataProviderEntity`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/entities/data-provider.entity.ts) to remove `parentId`, `@ManyToOne parent`, and `@OneToMany children`.
- **DTOs & Requests**:
  - Modified [`DataProviderDto`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/data-provider.dto.ts) to remove `parentId`, `parent`, and `children`.
  - Modified [`CreateDataProviderRequestDto` & `UpdateDataProviderRequestDto`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/dtos/requests/data-provider-request.dto.ts) to remove `parentId` fields and unnecessary `IsUUID` import.
- **Service Layer**:
  - Simplified [`DataProviderService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider.service.ts):
    - `findById`: Removed `{ relations: { parent: true } }` and configuration fallback.
    - `create`: Enforces unique identifier and baseUrl globally.
    - `update`: Enforces unique identifier globally across all providers.
    - `updateTargetConfig`: Allows updating any provider without `parentId: IsNull()` constraint.
    - `switchStatus`: Simplified transition rules directly for the provider without checking parent status.
  - Cleaned up [`ScrapingDataService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/scraping-data.service.ts) to remove `.leftJoinAndSelect('dataProvider.parent', 'parent')`.
  - Cleaned up [`DataProviderSearchService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search.service.ts), [`GenericDataProviderSearchService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-search/generic-data-provider-search.service.ts), and [`GenericDataProviderScraperService`](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/data-provider-scraper/generic-data-provider-scraper.service.ts) to remove fallback to `dataProvider.parent.*`.

### Frontend (`only-one-fe`):
- **Interfaces & Types**:
  - Modified [`IDataProvider`](file:///d:/Sources/Personal/only-one-fe/src/interfaces/data-provider.d.ts) to remove `parentId`, `parent`, and `children`.
  - Modified [`DataProviderFormValues`](file:///d:/Sources/Personal/only-one-fe/src/app/\(root\)/scraping/data-providers/types.ts) to remove `parentId`.
- **UI Components & Hooks**:
  - Modified [`DataProviderFormModal.tsx`](file:///d:/Sources/Personal/only-one-fe/src/app/\(root\)/scraping/data-providers/components/DataProviderFormModal.tsx): Removed `parentOptions` prop, `parentId` initial value, and the "Nhà cung cấp cha" select input.
  - Modified [`hooks.ts`](file:///d:/Sources/Personal/only-one-fe/src/app/\(root\)/scraping/data-providers/hooks.ts): Removed `parentId` mapping and unused `useSelectDataProvider`.
  - Modified [`page.tsx`](file:///d:/Sources/Personal/only-one-fe/src/app/\(root\)/scraping/data-providers/page.tsx): Removed `parentOptions` prop passing to `<DataProviderFormModal />`.

---

## 2. Verification Results

| Suite | Command | Result |
| :--- | :--- | :--- |
| **BE Build** | `npm run build` in `only-one-be` | `PASSED` (0 errors) |
| **BE Lint** | `npm run lint:fix` in `only-one-be` | `PASSED` (0 errors) |
| **FE Lint & Format** | `npm run format` & `npx eslint` in `only-one-fe` | `PASSED` (0 errors) |
