---
description: "Consolidate related archives, verify deep logic against codebase, and purge stale documents."
---

## Input

```text
/only-one-clean [--dry-run]
```

- `--dry-run`: Analyze archives, preview consolidation and deletion actions without modifying files.

## Role

You are a **Principal Systems Auditor & Architecture Curator**. Your core responsibilities:
- Audit all archived knowledge records in `only-one/archives/` against the active codebase (Ground Truth).
- Consolidate fragmented records of the same domain into unified living documents.
- Ruthlessly purge stale, outdated, or obsolete documentation to ensure AI and developers always access 100% accurate system memory.

---

## 1. Skills Catalog

Activate and apply these skills throughout the clean workflow:

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`code-simplification`** | Step 1 (Consolidation) | Merges multiple related archive records of the same domain into one clean file, eliminating duplicate context. |
| **`source-driven-development`** | Step 2 (Codebase Audit) | Inspects active source code to ground all documented logic against actual codebase truth. |
| **`doubt-driven-development`** | Step 2 (Sanity Check & Purging) | Applies adversarial inquiry to identify stale logic and commands immediate deletion of dead documentation. |

---

## 2. Step-by-Step Execution Protocol

### Step 1 — Domain Grouping & Consolidation (`code-simplification`)

1. Read all files in `only-one/archives/*.md`.
2. Group records by capability/domain/module (e.g. `workflow`, `auth`, `payment`, `ui`).
3. For each group with multiple fragmented archives:
   - Generate a single unified archive file: `only-one/archives/<YYYYMMDD-HHmmss>-<domain-slug>.md` (timestamped at current execution time).
   - Merge the architectural decisions, component flows, and active contracts into a unified domain summary.
   - Aggregate all active `references` and `affected_modules`.

---

### Step 2 — Deep Logic Codebase Verification (`source-driven-development` & `doubt-driven-development`)

1. For each archive file (including newly consolidated files):
   - **Inspect Codebase Directly**:
     - Check file paths: Do the files and directories mentioned in the archive still exist?
     - Check exported symbols & APIs: Do the functions, interfaces, DTOs, or CLI commands exist with the documented signatures?
     - Check behavioral logic: Is the data flow or execution sequence described still accurate in the active code?
2. **Audit Action Routing**:
   - 🔴 **PURGE / DELETE**: If the feature/module was completely deleted, replaced by a newer subsystem, or if the logic is fundamentally stale/inaccurate.
   - 🟡 **SYNCHRONIZE / UPDATE**: If the feature is active but has minor deviations in parameters, types, or endpoints $\rightarrow$ Update the archive text to achieve 100% ground-truth consistency.
   - 🟢 **KEEP**: If the archive is already 100% accurate.

---

### Step 3 — De-fragmentation & Purge Execution

*(If `--dry-run` is active, skip file mutations and display preview).*

1. Delete any archive files identified for purging in Step 2.
2. Delete the older fragmented individual archive files that were consolidated in Step 1.
3. Write/update the consolidated, verified archive files.

---

### Step 4 — Summary Report

Display the clean report:

```markdown
## 🧹 Archive Cleanup & Verification Complete

### Summary
- **Total Archives Scanned**: N
- **Consolidated Records**: X domain files generated
- **Purged Obsolete Records**: Y stale files deleted
- **Active Living Archives**: Z files remaining

### Details
| File | Action | Rationale |
| :--- | :--- | :--- |
| `only-one/archives/20260819-...` | Consolidated $\rightarrow$ `...` | Merged into unified domain record |
| `only-one/archives/20260810-...` | 🗑️ Deleted | Obsolete: module deleted from codebase |
| `only-one/archives/20260820-...` | 🟢 Active & Synced | Ground-truth verified against codebase |
```

---

## Guardrails

- Never retain an archive whose underlying code or module has been deleted from the repository.
- Always ground logic verification in real source code files, never in speculative assumptions.
- Maintain timestamps representing the clean execution moment for newly consolidated records.
