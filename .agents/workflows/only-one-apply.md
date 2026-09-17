---
description: "Implement tasks from an approved plan.md or debug.md file by parsing the Machine-Readable Task Matrix in Section 3 and applying changes in dependency order."
---

## Input

```text
/only-one-apply [<task-folder> | <plan-path> | <debug-path>]
```

- **With `<task-folder>`, `<plan-path>`, or `<debug-path>`**: use the given plan/debug file (e.g., `only-one/tasks/20260819-142500-soft-delete/plan.md` or `only-one/tasks/20260917-100000-debug-bug/debug.md`) directly. If a task folder is given, locate `plan.md` or `debug.md` within it (prefer `in-progress` > `planned`/`planning`).
- **Without path**: search `only-one/tasks/` for active tasks:
  ```bash
  grep -rlE "status: in-progress" only-one/tasks/ --include="plan.md" --include="debug.md" 2>/dev/null
  grep -rlE "status: (planned|planning)" only-one/tasks/ --include="plan.md" --include="debug.md" 2>/dev/null
  ```
  - Prefer `in-progress` over `planned`/`planning`.
  - If multiple found, display the list and ask the user to select.
  - If none found, report: "No active plan or debug task found in only-one/tasks/." and stop.

## Role

You are a **Senior Software Engineer**. Your core responsibilities:
- Fast-path ingest the **Section 3 Machine-Readable Task Matrix** from `plan.md` or `debug.md` in sub-second time.
- Implement the changes described in `plan.md` or `debug.md`, one file at a time, strictly following Section 4 blueprint guidance and respecting `Depends On` ordering.
- Apply execution and quality disciplines (`incremental-implementation`, `test-driven-development`, `code-simplification`, `diagnosing-bugs`).
- Run the targeted `Fast Test Command` immediately after modifying each file to maintain rapid feedback loops.
- Record verification evidence directly into Section 5 of `plan.md` or `debug.md` and report a concise walkthrough summary in the chat turn.

## Purpose

Execute an approved plan or debug document with maximum machine efficiency and human clarity, verifying every file change against targeted test cases.

---

## 1. Skills Catalog (Build & Execution Disciplines)

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`context-engineering`** | Step 1b (Loading rules and skills) | Feed only the necessary, high-signal context into working memory (Negative Rules in `rules.md` and Tech Skills) before modifying code. |
| **`incremental-implementation`** | Step 4 (Applying file changes) | Apply changes in **thin vertical slices** (file-by-file), enforcing safe parameter defaults, dependency order, and rollback-friendly modifications. |
| **`code-simplification`** | Step 4 (Quality Gate) | Audit new/modified code against YAGNI: eliminate dead code, remove orphan imports, avoid speculative wrappers, and keep cognitive load low. |
| **`test-driven-development`** | Step 4 & 5 (Verification) | Enforce the **Beyoncé Rule** (*"If you changed the behavior, you must have a test proving it"*), structure DAMP tests, and execute test suites. |
| **`diagnosing-bugs`** | When any compiler, lint, or test failure occurs | Apply a **disciplined Red Feedback Loop** (Reproduce Red $\rightarrow$ Localize $\rightarrow$ Hypothesize $\rightarrow$ Instrument $\rightarrow$ Fix) instead of blind guess-and-patch. |

---

## 2. Step-by-Step Execution Protocol

### Step 1 — Locate and read the plan or debug document

**If a path or task folder is provided:**
1. If target is a file path (`plan.md` or `debug.md`), read it directly.
2. If target is a task folder, check for `plan.md` or `debug.md`. If both exist, prioritize `in-progress` $\rightarrow$ `planned`/`planning`.
3. If neither exists, report error and stop.

**If no path is provided:**
```bash
grep -rlE "status: in-progress" only-one/tasks/ --include="plan.md" --include="debug.md" 2>/dev/null
grep -rlE "status: (planned|planning)" only-one/tasks/ --include="plan.md" --include="debug.md" 2>/dev/null
```
- Prefer `in-progress` over `planned`/`planning`.
- If multiple found, display the list and ask the user to select.
- If none found, report: "No active plan or debug task found in only-one/tasks/." and stop.

---

### Step 1b — Load rules and skills (`context-engineering`)

1. **Load Negative Rules (Mandatory Constraints)**:
   Read `only-one/rules.md` if present. Strictly obey all negative constraints.
2. **Load Project Tech & Language Skills (Mandatory Standards)**:
   Check `only-one/skills/` (and `.agents/skills/`) for relevant technology and language skills (e.g. `nestjs-development`, TypeScript strict typing).
   Read their `SKILL.md` to extract coding conventions, naming patterns, typing rules, and architectural standards.

---

### Step 2 — Validate document & Set status to in-progress

Check the frontmatter `status` field:
- `planned` / `planning` $\rightarrow$ update frontmatter to `status: in-progress`.
- `in-progress` $\rightarrow$ proceed immediately, resuming from where work left off.
- `done` / `fixed` $\rightarrow$ report: "This task is already marked done/fixed." and stop.

---

### Step 3 — Ingest Source Structure & Parse Task Matrix

1. **Review Source Structure Changes**: Ingest the ASCII directory tree (Section 3.1 in `plan.md` or Section 2.2 in `debug.md`) to establish an immediate mental model of all touched files (`[NEW]`, `[MODIFY]`, `[DELETE]`, `[RENAME]`).
2. **Parse Section 3 Task Matrix & Dependency Graph**:
   - Jump to **Section 3 Task Matrix & Dependency Graph** in `plan.md` or `debug.md`.
   - Extract the ordered sequence: `Order`, `Status`, `Action`, `File Path`, `Target Symbols`, `Depends On`, `Fast Test Command`.
   - Skip rows already marked `[x]` (Done), identify the first pending row `[ ]` or in-progress row `[/]`.

---

### Step 4 — Apply File Changes Incrementally (`incremental-implementation`)

For each pending row in the Task Matrix:
1. Verify that all prerequisite files (`Depends On`) have been successfully applied and verified (`[x]`).
2. Mark the row's `Status` as `[/]` (in-progress) in the active document (`plan.md` or `debug.md`).
3. **Step 4a — Pre-apply Context, Existing Imports & Language Skill Compliance Gate**:
   - Read the target file (`view_file`) to inspect its current imports, shared utilities, and surrounding code patterns.
   - Verify that existing project helpers/hooks are properly imported and utilized (Reuse-First Invariant).
   - ❌ **Strict Anti-Reinvention Check**: Do NOT write inline helper logic or duplicate functions if a shared project utility already exists.
   - 🛑 **Strict Language Skill & Rule Adherence Gate**:
     - Code modification MUST strictly follow conventions defined in active language/tech skills (Step 1b) and `only-one/rules.md`.
     - ❌ **Anti-Agent-Drift**: DO NOT code arbitrarily based on agent habits or unverified training defaults. Adhere 100% to project typing, naming, and error handling standards.
4. **Step 4b — Apply Code Modification (Diff Application)**:
   - Locate the corresponding file in **Section 4. Code Changes (Unified Diff)**.
   - Apply the modification precisely by replacing the deleted lines (`-`) with added lines (`+`).
5. **Step 4c — Run Fast Test Command**:
   - Run the row's **`Fast Test Command`** immediately:
     - If test passes: mark row `Status` as `[x]` (done) in the document and proceed to next row.
     - If test fails: activate `diagnosing-bugs` (Red Feedback Loop $\rightarrow$ Instrument $\rightarrow$ Fix).

---

### Step 5 — Final Comprehensive Verification & In-Chat Reporting

1. Run the full repository test and lint commands:
   ```bash
   npm test
   npm run lint
   ```
2. **Update Document Verification Evidence & Completion**:
   - Update Section 5 of `plan.md` or `debug.md` by marking verified test items with `[x]` and appending concrete test execution evidence (e.g., `PASS - X tests passed`).
   - Update document frontmatter:
   ```yaml
   status: done   # (hoặc status: fixed cho debug.md)
   completed_at: <YYYY-MM-DD>
   ```
3. **In-Chat Walkthrough Presentation (Zero walkthrough.md File Creation)**:
   - Output a clean, structured walkthrough summary directly in the chat response.
   - ❌ **Strict No-Extra-File Invariant**: Do NOT create a separate `walkthrough.md` file on disk.

---

## Guardrails

- **🛑 Strict Task Document Invariant (Zero walkthrough.md Creation)**: Each task folder must contain ONLY `concept.md` and `plan.md` (or `debug.md`). Never generate a separate `walkthrough.md` file on disk. Present walkthrough results directly in the conversation response.
- **🛑 Strict Tech Skill & Rule Adherence**: Applied code must strictly adhere to active language/tech skills and repository rules. Agent MUST NOT write arbitrary code based on personal assumptions.
- **Enforce Reuse-First Verification**: Always inspect target file imports and utilize project shared utilities; never duplicate existing code.
- Prioritize parsing Section 3 Task Matrix for sub-second ingestion.
- Execute `Fast Test Command` per file before proceeding to the next.
- Maintain Beyoncé Rule at all times.
