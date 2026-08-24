# Walkthrough: Data Provider Feature History Modal & BE Synchronization

## 1. Summary of Changes

### Backend (`only-one-be`)
- **[config-version.service.ts](file:///d:/Sources/Personal/only-one-be/src/modules/data-provider/services/config-version.service.ts)**:
  - `getConfigVersionOptionsByFeature`: Added `changeDescription`, `createdBy`, and `user.*` (`id`, `firstName`, `lastName`, `email`, `userName`) into the `.select([...])` query builder so author and revision details are populated in `ConfigVersionDto`.
  - `rollbackToVersionIdByFeature`: Wrapped snapshot creation and `DataProviderFeatureEntity.config` update inside a TypeORM database transaction (`dataSource.transaction`), guaranteeing atomic synchronization between the version snapshot and active feature runner state.

### Frontend (`only-one-fe`)
- **[types.ts](file:///d:/Sources/Personal/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/types.ts)**:
  - Added `HistoryModalState` interface.
- **[hooks.ts](file:///d:/Sources/Personal/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/hooks.ts)**:
  - Added `historyModalState`, `openHistoryModal`, and `closeHistoryModal` state handlers.
- **[FeatureHistoryModal.tsx](file:///d:/Sources/Personal/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/components/FeatureHistoryModal.tsx)**:
  - Created a dedicated Master-Detail Modal (`FeatureHistoryModal`) displaying a chronological version timeline (left pane) and a JSON config inspector with copy button & "Áp dụng phiên bản này" (Apply/Rollback) button with `CustomPopconfirm` confirmation (right pane).
- **[FeatureCard.tsx](file:///d:/Sources/Personal/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/components/FeatureCard.tsx)**:
  - Added `onOpenHistoryModal` prop and attached it to the "Lịch sử" button.
- **[components/index.ts](file:///d:/Sources/Personal/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/components/index.ts)**:
  - Exported `FeatureHistoryModal`.
- **[page.tsx](file:///d:/Sources/Personal/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/page.tsx)**:
  - Hooked `openHistoryModal` into `FeatureCard` and mounted `<FeatureHistoryModal />`.

---

## 2. Verification Results

### Backend Build Check
- **Command**: `npm run build` in `only-one-be`
- **Result**: `✓ Compiled successfully (code 0)`.

### Frontend Build Check
- **Command**: `npm run build` in `only-one-fe`
- **Result**: `✓ Compiled successfully in 48s` (Next.js 16 Turbopack build, all 27 static routes generated with 0 errors).

---

## 3. Completion Evidence (Key Code Snippets)

### FeatureHistoryModal UI
```tsx
// Left: Version List with Badges & Descriptions
// Right: Details, JSON Syntax Snapshot, Copy JSON, Apply Rollback
<FeatureHistoryModal
    open={historyModalState.open}
    feature={historyModalState.feature}
    onClose={closeHistoryModal}
    onSuccess={refetchAll}
/>
```

### Atomic Rollback Transaction
```typescript
await this.dataSource.transaction(async (manager) => {
    const configVersionRepo = manager.getRepository(ConfigVersionEntity);
    const featureRepo = manager.getRepository(DataProviderFeatureEntity);

    // 1. Deactivate current active versions
    await configVersionRepo.update({ featureId, isActive: true }, { isActive: false });

    // 2. Insert new rollback snapshot
    await configVersionRepo.save(newVersionEntity);

    // 3. Synchronize feature entity config
    await featureRepo.update(featureId, {
        config: targetVersion.config,
        consecutiveFailures: 0,
        lastErrorMessage: null,
        lastErrorType: null,
    });
});
```

---

## 4. User Constraints & Lessons Learned
- **[AVOID]** Relying solely on separate version snapshots without updating active feature entity config — Whenever a rollback snapshot is persisted, the active feature entity `config` column must be atomically synchronized in the same transaction.
