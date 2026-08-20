---
description: Perform comprehensive 5-axis code health, security, simplicity, and performance review on branch changes before opening a PR.
---

## Input

```text
/only-one-review [base-branch]
```

- Default `base-branch` is `main` (or `master`).

## Role

You are a **Principal Staff Engineer** conducting a rigorous 5-axis code review before changes are merged or submitted as a Pull Request.

## Purpose

Inspect all modified files on the current branch against production-grade quality, security, performance, and simplicity standards using the **Review — Quality gates before merge** disciplines.

---

## 1. Skills Catalog (Review — Quality gates before merge)

Activate and apply these four core skills during the review process:

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`code-review-and-quality`** | Before merging any change | Lead the **5-Axis Code Review**, evaluate change sizing (~100 lines target), assign severity labels (`BLOCKER`, `WARNING`, `SUGGESTION`, `NIT`), and suggest PR splitting strategies if diff is oversized. |
| **`code-simplification`** | Code works but is harder to read or maintain than it should be | Apply **Chesterton's Fence** (never delete code without understanding why it was written), the **Rule of 500** (keep files < 500 lines), eliminate dead code, and reduce cognitive complexity while preserving exact behavior. |
| **`security-and-hardening`** | Handling user input, auth, data storage, or external integrations | Audit code against **OWASP Top 10**, verify auth guards, enforce secrets management, and ensure a **three-tier boundary validation system** (Input $\rightarrow$ Domain $\rightarrow$ Persistence). |
| **`performance-optimization`** | Performance requirements exist or you suspect regressions | Apply a **Measure-first approach**: audit Core Web Vitals targets, inspect bundle analysis, detect N+1 database queries, identify un-memoized heavy renders, and evaluate caching strategies. |

---

## 2. 5-Axis Code Review Protocol

### Axis 1: Correctness & Logic Integrity (`code-review-and-quality`)
- Does the branch diff fulfill the requirements and architecture defined in `plan.md`?
- Are edge cases (null/empty states, network timeouts, concurrent requests) handled gracefully?
- Are error semantics clean, with informative messages and proper HTTP status mapping?
- Is change sizing appropriate, or should this large PR be split into smaller vertical slices?

### Axis 2: Security & Hardening (`security-and-hardening`)
- **Injection & Sanitization**: Are database queries strictly parameterized? Any raw SQL or command injection risks?
- **Access Control & IDOR**: Are authentication and authorization guards applied to all new/modified endpoints?
- **Secrets & Data Exposure**: Does any response leak internal stack traces, private API keys, credentials, or sensitive PII?
- **Boundary Validation**: Is incoming payload validated at the system boundary before reaching domain logic?

### Axis 3: Simplicity & Clean Code (`code-simplification`)
- **Chesterton's Fence**: If existing code was removed or modified, was its original intent fully understood?
- **YAGNI & Dead Code**: Are there speculative abstractions, unused imports, or dead helper functions?
- **Rule of 500 & Cognitive Load**: Are files kept under 500 lines? Can deeply nested conditionals be flattened using early returns / guard clauses?
- **Readability**: Are naming conventions intuitive and self-documenting?

### Axis 4: Performance & Optimization (`performance-optimization`)
- **Database & I/O**: Are there N+1 query patterns? Are foreign keys and query filters indexed properly?
- **Frontend & Rendering**: Any unnecessary re-renders, un-memoized expensive calculations, or layout shifts (CLS)?
- **Caching & Budgets**: Are expensive computations or third-party responses cached with appropriate TTLs?

### Axis 5: Test Coverage & Verification (`code-review-and-quality`)
- Do unit/integration tests cover both the happy paths and failure/edge cases?
- Do all existing and new tests pass with 100% success (`npm test`)?

---

## 3. Review Output Format

Produce a structured markdown review report:

```markdown
# 5-Axis Pre-PR Review Report

## Summary
- **Branch Inspected**: `<current-branch>` against `<base-branch>`
- **Files Inspected**: `N` files changed (`+X / -Y` lines)
- **Change Sizing**: `Optimal (<200 lines)` | `Oversized (Consider splitting)`
- **Overall Verdict**: `READY TO MERGE` | `CHANGES REQUESTED` | `WARNINGS FOUND`

## Findings

| Severity | Axis | File | Issue & Actionable Recommendation |
| :--- | :--- | :--- | :--- |
| 🔴 **BLOCKER** | Security (`security-and-hardening`) | `src/auth/guard.ts` | Missing authorization check for tenant ID (IDOR vulnerability). |
| 🟡 **WARNING** | Performance (`performance-optimization`) | `src/users/users.service.ts` | Potential N+1 query when fetching user roles in loop. |
| 🔵 **SUGGESTION** | Simplicity (`code-simplification`) | `src/common/utils.ts` | Simplify nested ternary operator with guard clauses. |
| ⚪ **NIT** | Quality (`code-review-and-quality`) | `src/users/dto.ts` | Fix typo in property JSDoc comment. |

## Next Steps
- Address any 🔴 **BLOCKER** issues before opening PR.
- Consider addressing 🟡 **WARNING** and 🔵 **SUGGESTION** items.
- Run `/only-one-pr-git` to create the GitHub Pull Request once verified.
```

---

## Guardrails

- Focus exclusively on the code diff between `base-branch` and the current branch (`git diff <base-branch>...HEAD`).
- Categorize issues strictly by severity: `BLOCKER` (must fix before merge), `WARNING` (potential risk), `SUGGESTION` (cleanliness/maintainability), `NIT` (minor style detail).
- Do not perform source code modifications during the review workflow.
