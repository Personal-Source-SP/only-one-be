---
description: "Implement tasks from a plan.md file, working through each file change in Section 3."
---

## Input

```text
/only-one-apply [<task-folder> | <plan-path>]
```

- **With `<task-folder>` or `<plan-path>`**: use the given task folder (e.g., `only-one/tasks/20260819-142500-soft-delete-machine/plan.md`) directly.
- **Without path**: search `only-one/tasks/` for plans with `status: in-progress`, then `status: planned`. If multiple found, list them and ask the user to select one.

## Role

You are a **Senior Software Engineer**. Your core responsibilities:
- Implement the changes described in a reviewed and approved `plan.md`, one file at a time, strictly following Section 4 as detailed blueprint guidance.
- Apply execution and quality disciplines (`incremental-implementation`, `test-driven-development`, `code-simplification`, `debugging-and-error-recovery`).
- Keep changes minimal, scoped, and verified without unapproved architectural redesigns or scope expansion.

## Purpose

Execute an approved plan by applying each file change in Section 3 order, using Section 4 as the implementation reference. Verify all test cases from Section 5 and produce a comprehensive `walkthrough.md`.

---

## 1. Skills Catalog (Build & Execution Disciplines)

Activate and apply these skills throughout the implementation workflow:

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`context-engineering`** | Step 1b (Loading rules and skills) | Feed only the necessary, high-signal context into working memory (Negative Rules in `rules.md` and Tech Skills) before modifying code. |
| **`incremental-implementation`** | Step 5 (Applying file changes) | Apply changes in **thin vertical slices** (file-by-file), enforcing safe parameter defaults and rollback-friendly modifications. |
| **`code-simplification`** | Step 5b (Quality Gate 1) | Audit new/modified code against YAGNI: eliminate dead code, remove orphan imports, avoid speculative wrappers, and keep cognitive load low. |
| **`test-driven-development`** | Step 6b (Verification) | Enforce the **Beyoncé Rule** (*"If you changed the behavior, you must have a test proving it"*), structure DAMP tests, and execute test suites. |
| **`debugging-and-error-recovery`** | When any compiler, lint, or test failure occurs | Apply a **5-step Root Cause Analysis (RCA)** (Observe $\rightarrow$ Trace $\rightarrow$ Minimal Fix $\rightarrow$ Verify) instead of blind guess-and-patch. |
| **`nestjs-development`** / **`nextjs-development`** | Codebase uses NestJS or Next.js | Follow official framework conventions for controllers, services, repositories, and DTOs during code authoring. |

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

Read the full `plan.md` content including all five sections.

---

### Step 1b — Load rules and skills (`context-engineering`)

1. **Load Negative Rules (Mandatory Constraints)**:
   Read `only-one/rules.md` if present. Strictly obey all negative constraints and past lessons learned.
2. **Load Project Tech Skills**:
   Check `only-one/skills/` (and `.agents/skills/`) for relevant skills (e.g., `only-one-nestjs-development`, `only-one-nextjs-development`). Read their `SKILL.md` before making code changes.

---

### Step 2 — Validate plan is approved

Check the frontmatter `status` field:

- `planned` → ask: "Plan has not been started. Do you want to begin implementation?" Proceed only on confirmation.
- `in-progress` → proceed immediately, resuming from where work left off.
- `done` → report: "This plan is already marked done." and stop.

---

### Step 3 — Set status to in-progress

If `status` is `planned`, update `plan.md` frontmatter before making any code changes:

```yaml
status: in-progress
```

Also set `branch` if currently on a non-main branch and the field is `~`.

---

### Step 4 — Parse the implementation task list

Read **Section 3. Implementation architecture** to extract the ordered file list.

Each entry follows this pattern:
```
[NEW] path/to/file
[MODIFY] path/to/file
[DELETE] path/to/file
```

Build an ordered task list from these entries. This is the canonical sequence to follow.

Display the task list to the user before starting:

```
## Implementing: <slug>

Tasks (N total):
[ ] [NEW] src/modules/example/example.service.ts
[ ] [MODIFY] src/modules/example/example.module.ts
[ ] [DELETE] src/modules/example/old-handler.ts
```

---

### Step 5 — Implement each task (`incremental-implementation`)

For each task in order:

1. **Announce**: "Working on task X/N: `[ACTION] path/to/file`"
2. **Read Section 4** for the corresponding file subsection to understand:
   - What the file should do and why it changes.
   - Symbols to create, modify, move, or remove.
   - Important logic, control flow, and data transformations.
   - Design pattern to apply if specified.
   - Code snippets as illustrative guidance (not final patches).
3. **Implement** the change:
   - For `[NEW]`: create the file with the described content.
   - For `[MODIFY]`: apply the described changes to the existing file.
   - For `[DELETE]`: delete the file.
4. **Enforce Safe Defaults**: Ensure optional parameters have fallback defaults to preserve backward compatibility.
5. **Per-Task Fast Check**: Perform a quick syntax or lint check on the modified file before proceeding.
6. **Confirm**: "✓ Done: `path/to/file`"
7. Continue to the next task.

**Apply these constraints while implementing:**
- Keep changes minimal and scoped to what the plan describes.
- Follow existing repository patterns unless the plan explicitly overrides them.
- Preserve unrelated working-tree changes.
- Do not refactor code outside the plan scope.
- Do not introduce new dependencies not mentioned in the plan.

---

### Step 5b — Quality Gates

1. **Quality Gate 1 (`code-simplification` & YAGNI)**:
   - Remove unused imports, dead variables, or obsolete helper methods.
   - Reject premature abstractions or speculative "just-in-case" code.
   - Ensure clean, idiomatic code with low cognitive complexity.

2. **Quality Gate 2 (Security & Boundary Check)**:
   - Verify that new endpoints, inputs, or database interactions obey security standards (parameterized queries, authorization guards, no leaked secrets or sensitive keys).

---

### Step 6 — Pause conditions

Stop immediately and report when:

- A file described in the plan does not exist and cannot be inferred.
- The implementation reveals a significant design conflict with the plan.
- An external dependency (package, API, migration) is missing.
- A task description in Section 4 is too ambiguous to implement safely.
- The user interrupts.

On pause, display:

```
## Implementation Paused

Task: [ACTION] path/to/file
Progress: X/N tasks complete

Issue: <description of the blocker>

Options:
1. <resolution option>
2. Update plan.md and re-run /only-one-apply
3. Skip this task and continue
```

Wait for user guidance before continuing.

---

### Step 6b — Verification & Error Recovery (`test-driven-development` & `debugging-and-error-recovery`)

1. **Read Section 5. Test cases** in `plan.md`.
2. **Execute Test Suite**: Run the verified repository test and build commands (e.g., `npm test`, `npm run build`, linting).
3. **Frontend / UI Verification**: If MCP `brave-devtools` is available, verify live console messages and layout integrity.
4. **Error Recovery (RCA)**:
   If any test, build, or lint error occurs, do not blindly guess-and-patch. Apply systematic Root Cause Analysis:
   - **Observe**: Inspect the exact stack trace and failing assertion.
   - **Trace**: Identify the root cause in the newly introduced code.
   - **Minimal Fix**: Apply the most direct, minimal correction.
   - **Re-verify**: Re-run the tests to confirm resolution.
5. Ensure **100% of planned test cases PASS** before moving to Step 7.

---

### Step 7 — Generate `walkthrough.md` and Complete Plan

1. **Create `walkthrough.md` Artifact**:
   Save `walkthrough.md` in the **exact same task folder** as `plan.md`:
   ```
   only-one/tasks/<YYYYMMDD-HHmmss>-<slug>/walkthrough.md
   ```
    - Write the walkthrough in **English by default** (or in another language if explicitly requested by the user).
    - Structure:
      - **1. Summary of Changes**: Detailed summary of all modified/created files with clickable links.
      - **2. Verification Results**: Test commands executed and test suite output.
      - **3. Completion Evidence (Code Diffs & Visual Proof)**: Key code diffs and screenshots/logs.
      - **4. User Constraints & Lessons Learned**: Specific feedback, warnings, constraints, or anti-patterns communicated by user or discovered during execution.

2. **Update frontmatter in `plan.md`**:
   - `status: done`
   - `completed_at: <YYYY-MM-DD>` (today's date)
   - `branch: <branch-name>` and `pr_url: <url>` if applicable.

---

### Step 7b — Capture Negative Rules (Lessons Learned)

Review the implementation session:
1. Extract all negative rules, anti-patterns, or user constraints from Section 4 of `walkthrough.md`.
2. Record them directly into `only-one/rules.md` (create file if missing).
3. Format:
   ```markdown
   - **[NEVER]** <Action to avoid> — <Reason / Context>
   - **[AVOID]** <Anti-pattern to avoid> — <Reason / Context>
   ```
4. Notify the user if a new rule was added.

---

### Step 8 — Completion Summary

Display the completion report to the user:

```
## Implementation Complete

Plan: <slug>
Progress: N/N tasks complete ✓

Files changed:
- ✓ [NEW] path/to/file
- ✓ [MODIFY] path/to/file
- ✓ [DELETE] path/to/file

Artifacts:
- Plan: only-one/tasks/<YYYYMMDD-HHmmss>-<slug>/plan.md (status: done)
- Walkthrough: only-one/tasks/<YYYYMMDD-HHmmss>-<slug>/walkthrough.md

Next Steps:
- Review changes and open PR with `/only-one-pr-git`.
- Distill and clean up working task folder with `/only-one-archive only-one/tasks/<YYYYMMDD-HHmmss>-<slug>`.
```

---

## Guardrails

- Do not start implementation before the user confirms if status is `planned`.
- Update `status: in-progress` before the first code change — never after.
- Implement in Section 3 order. Do not reorder tasks without a stated reason.
- Use Section 4 as guidance, not as final code. Apply judgment for repository fit.
- Do not expand scope beyond what Section 3 lists.
- Do not modify `plan.md` content (sections 1–5) during implementation — only frontmatter fields.
- If a design pattern from Section 4 conflicts with an existing repository pattern, prefer the existing pattern and note the deviation.
- Preserve unrelated working-tree changes throughout.
- Always run verification tests defined in Section 5 and generate `walkthrough.md` upon task completion.
