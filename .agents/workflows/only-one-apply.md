---
description: "Implement tasks from a plan.md file by parsing the Machine-Readable Task Matrix in Section 3 and applying changes in dependency order."
---

## Input

```text
/only-one-apply [<task-folder> | <plan-path>]
```

- **With `<task-folder>` or `<plan-path>`**: use the given task folder (e.g., `only-one/tasks/20260819-142500-soft-delete-machine/plan.md`) directly.
- **Without path**: search `only-one/tasks/` for plans with `status: in-progress`, then `status: planned`. If multiple found, list them and ask the user to select one.

## Role

You are a **Senior Software Engineer**. Your core responsibilities:
- Fast-path ingest the **Section 3.1 Machine-Readable Task Matrix** from `plan.md` in sub-second time.
- Implement the changes described in `plan.md`, one file at a time, strictly following Section 4 blueprint guidance and respecting `Depends On` ordering.
- Apply execution and quality disciplines (`incremental-implementation`, `test-driven-development`, `code-simplification`, `diagnosing-bugs`).
- Run the targeted `Fast Test Command` immediately after modifying each file to maintain rapid feedback loops.
- Author a comprehensive `walkthrough.md` summarizing verified results and evidence.

## Purpose

Execute an approved plan with maximum machine efficiency and human clarity, verifying every file change against targeted test cases.

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

### Step 1 — Locate and read the plan

**If a path or task folder is provided:**
1. Read the `plan.md` file at the given path/folder.
2. If the file does not exist, report error and stop.

**If no path is provided:**
```bash
grep -rl "status: in-progress" only-one/tasks/ --include="plan.md" 2>/dev/null
grep -rl "status: planned" only-one/tasks/ --include="plan.md" 2>/dev/null
```
- Prefer `in-progress` over `planned`.
- If multiple found, display the list and ask the user to select.
- If none found, report: "No active plan found in only-one/tasks/." and stop.

---

### Step 1b — Load rules and skills (`context-engineering`)

1. **Load Negative Rules (Mandatory Constraints)**:
   Read `only-one/rules.md` if present. Strictly obey all negative constraints.
2. **Load Project Tech Skills**:
   Check `only-one/skills/` (and `.agents/skills/`) for relevant skills. Read their `SKILL.md` before making code changes.

---

### Step 2 — Validate plan is approved & Set status to in-progress

Check the frontmatter `status` field:
- `planned` $\rightarrow$ update `plan.md` frontmatter to `status: in-progress`.
- `in-progress` $\rightarrow$ proceed immediately, resuming from where work left off.
- `done` $\rightarrow$ report: "This plan is already marked done." and stop.

---

### Step 3 — Fast-Path Parse Machine-Readable Task Matrix

1. Jump directly to **Section 3.1 Machine-Readable Task Matrix & Dependency Graph** in `plan.md`.
2. Extract the ordered sequence: `Order`, `Status`, `Action`, `File Path`, `Target Symbols`, `Depends On`, `Fast Test Command`.
3. Skip rows already marked `[x]` (Done), identify the first pending row `[ ]` or in-progress row `[/]`.

---

### Step 4 — Apply File Changes Incrementally (`incremental-implementation`)

For each pending row in the Task Matrix:
1. Verify that all prerequisite files (`Depends On`) have been successfully applied and verified (`[x]`).
2. Mark the row's `Status` as `[/]` (in-progress) in `plan.md`.
3. Locate the corresponding section in **Section 4. Implementation Code Examples** and apply the code modification at the exact `// [TARGET SEAM]`.
4. Run the row's **`Fast Test Command`** immediately:
   - If test passes: mark row `Status` as `[x]` (done) in `plan.md` and proceed to next row.
   - If test fails: activate `diagnosing-bugs` (Red Feedback Loop $\rightarrow$ Instrument $\rightarrow$ Fix).

---

### Step 5 — Final Comprehensive Verification & Walkthrough Authoring

1. Run the full repository test and lint commands:
   ```bash
   npm test
   npm run lint
   ```
2. Author `only-one/tasks/<task-folder>/walkthrough.md` in **Bilingual Hybrid Mode**:
   - Write explanations, summary of changes, and verification narrative in **Vietnamese**.
   - Preserve all technical terms, variable/function names, file paths, and test commands in **English**.
   - Detail test execution evidence (Pass/Fail) and manual testing instructions.
3. Update `plan.md` frontmatter:
   ```yaml
   status: done
   completed_at: <YYYY-MM-DD>
   ```

---

## Guardrails

- **Enforce Bilingual Hybrid Walkthrough**: Write narrative in Vietnamese while preserving English technical terms.
- Prioritize parsing Section 3.1 Task Matrix for sub-second ingestion.
- Execute `Fast Test Command` per file before proceeding to the next.
- Maintain Beyoncé Rule at all times.
