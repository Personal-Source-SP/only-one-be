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
- Automatically archive completed tasks from `only-one/tasks/` before performing cleanup.
- Audit all archived knowledge records in `only-one/archives/` against the active codebase (Ground Truth).
- Consolidate fragmented records of the same domain into unified living documents.
- Ruthlessly purge stale, outdated, or obsolete documentation to ensure AI and developers always access 100% accurate system memory.

---

## 1. Skills Catalog

Activate and apply these skills throughout the clean workflow:

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`task-lifecycle-resolution`** | Step 0 (Pre-clean task auto-archive) | Scans `only-one/tasks/` for completed tasks with `status: done` and triggers the auto-archiving protocol before clean. |
| **`context-engineering`** | Step 0 (Distilling negative rules) | Formats negative constraints and lessons learned into high-signal `[NEVER]` / `[AVOID]` rules inside `only-one/rules.md`. |
| **`code-simplification`** | Step 0 & Step 1 (Distillation & Consolidation) | Prunes raw task context into concise archive records and merges related domain archives into unified living documents. |
| **`source-driven-development`** | Step 2 (Codebase Audit) | Inspects active source code to ground all documented logic against actual codebase truth. |
| **`doubt-driven-development`** | Step 2 (Sanity Check & Purging) | Applies adversarial inquiry to identify stale logic and commands immediate deletion of dead documentation. |

---

## 2. Step-by-Step Execution Protocol

### Step 0 — Pre-Clean Auto-Archive (`task-lifecycle-resolution` & `context-engineering`)

1. Scan `only-one/tasks/` for task folders where `plan.md` has `status: done`.
2. For each completed task folder found:
   - If `--dry-run` is active:
     - Log: `[DRY-RUN] Found completed task: <slug> (would distill rules, author archive, and purge raw directory)`.
   - Otherwise:
     - Execute the full task archiving protocol:
       1. **Extract User Feedback & Distill Negative Rules (`context-engineering`)**:
          - Read `plan.md` (and `concept.md` if present).
          - Extract any negative constraints, rules, anti-patterns, or user warnings communicated during the task.
          - Append new negative rules to `only-one/rules.md` (prevent duplicate entries):
            ```markdown
            - **[NEVER]** <Action to avoid> — <Reason / Context>
            - **[AVOID]** <Anti-pattern to avoid> — <Reason / Context>
            ```
       2. **Direct Reference Resolution**:
          - Scan existing archive files in `only-one/archives/*.md`.
          - Identify any historical archives related to the same modules touched by this task for the `references` field.
       3. **Author Single Distilled Archive (`code-simplification`)**:
          - Create directory `only-one/archives/` if it does not exist.
          - Generate `only-one/archives/<timestamp>-<slug>.md` using the task's timestamp prefix (**Song ngữ Lai: Diễn giải bằng Tiếng Việt + thuật ngữ Tiếng Anh**):
            ```markdown
            ---
            id: <timestamp>-<slug>
            title: <Tên Task / Tính năng>
            archived_at: <YYYY-MM-DD>
            status: active
            references:
              - only-one/archives/<previous-related-archive>.md
            affected_modules:
              - <module-1>
              - <module-2>
            ---

            # Archive: <Tên Task / Tính năng>

            ## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
            - **Vấn đề (Problem)**: <Tóm tắt ngắn gọn vấn đề đã được giải quyết>
            - **Giá trị (Value)**: <Lợi ích cốt lõi mang lại cho hệ thống/người dùng>

            ## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
            - **Hướng tiếp cận (Approach)**: <Giải pháp kỹ thuật tổng quan>
            - **Sơ đồ (Diagram)**: <Sơ đồ Mermaid nếu có>

            ## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
            - Danh sách các module và file đã sửa đổi (kèm liên kết clickable).

            ## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
            - **Trạng thái Test**: 100% Passed.
            - **PR URL / Branch**: <Liên kết PR hoặc tên branch>
            ```
       4. **Purge Raw Task Directory**:
          - Confirm that `only-one/archives/<timestamp>-<slug>.md` has been successfully created.
          - Remove the raw task directory:
            ```bash
            rm -rf only-one/tasks/<timestamp>-<slug>
            ```
3. Check for tasks with `status: in-progress` or `status: planned`:
   - Log notice: `ℹ️ Preserved active/planned task: <slug>`.
   - Never archive or delete in-progress or planned tasks.

---

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

### Step 4 — Summary Report (Bilingual Hybrid)

Display the cleanup report in Vietnamese with English technical terminology:

```markdown
## 🧹 Hoàn tất Dọn dẹp & Xác thực Lưu trữ (Archive Cleanup Complete)

### Tổng quan (Summary)
- **Tác vụ Tự động Lưu trữ (Auto-Archived)**: W task hoàn thành được lưu trữ ở Step 0
- **Tổng số Archive Đã quét**: N
- **Tài liệu Hợp nhất (Consolidated)**: X file miền chuyên đề được tạo mới
- **Tài liệu Lỗi thời Đã xóa (Purged)**: Y file hết hạn/lỗi thời đã xóa
- **Archive Đang Hoạt động (Active)**: Z file còn lại

### Chi tiết (Details)
| File | Hành động (Action) | Lý do (Rationale) |
| :--- | :--- | :--- |
| `only-one/archives/20260819-...` | Consolidated $\rightarrow$ `...` | Hợp nhất vào tài liệu miền chuyên đề |
| `only-one/archives/20260810-...` | 🗑️ Deleted | Lỗi thời: module đã bị xóa khỏi codebase |
| `only-one/archives/20260820-...` | 🟢 Active & Synced | Đã xác thực 100% khớp với source code hiện tại |
```

---

## Guardrails

- **Enforce Bilingual Hybrid Report**: Author cleanup summary in Vietnamese; preserve file paths, timestamps, and status labels in English.
- Always auto-archive tasks with `status: done` in `only-one/tasks/` as Step 0 before performing archive consolidation and cleanup.
- Never modify, archive, or delete tasks with `status: in-progress` or `status: planned` during `/only-one-clean`.
- Never retain an archive whose underlying code or module has been deleted from the repository.
- Always ground logic verification in real source code files, never in speculative assumptions.
- Maintain timestamps representing the clean execution moment for newly consolidated records.
