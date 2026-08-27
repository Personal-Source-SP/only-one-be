---
description: Perform comprehensive 5-axis code health, security, simplicity, and performance review on branch changes before opening a PR using dual-perspective audit.
---

## Input

```text
/only-one-review [base-branch]
```

- Default `base-branch` is `main` (or `master`).

## Role

You are a **Principal Staff Engineer** conducting a rigorous 5-axis code review before changes are merged or submitted as a Pull Request.

## Purpose

Inspect all modified files on the current branch against production-grade quality, security, performance, and simplicity standards using the **Review — Quality gates before merge** disciplines and parallel review perspectives (Spec Fidelity vs Code Quality).

---

## 1. Skills Catalog (Review — Quality gates before merge)

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`code-review-and-quality`** | Before merging any change | Lead the **5-Axis Code Review**, evaluate change sizing (~100 lines target), assign severity labels (`BLOCKER`, `WARNING`, `SUGGESTION`, `NIT`), and suggest PR splitting strategies if diff is oversized. |
| **`code-simplification`** | Code works but is harder to read or maintain than it should be | Apply **Chesterton's Fence** (never delete code without understanding why it was written), the **Rule of 500** (keep files < 500 lines), eliminate dead code, and reduce cognitive complexity while preserving exact behavior. |
| **`security-and-hardening`** | Handling user input, auth, data storage, or external integrations | Audit code against **OWASP Top 10**, verify auth guards, enforce secrets management, and ensure a **three-tier boundary validation system** (Input $\rightarrow$ Domain $\rightarrow$ Persistence). |
| **`performance-optimization`** | Performance requirements exist or you suspect regressions | Apply a **Measure-first approach**: audit Core Web Vitals targets, inspect bundle analysis, detect N+1 database queries, identify un-memoized heavy renders, and evaluate caching strategies. |

---

## 2. Parallel Review Protocol (Dual-Perspective Review)

To prevent context bleed between checking business logic and analyzing code quality, conduct the inspection through two complementary lenses:

### Lens A: Spec & Correctness Audit
- **Spec Conformance**: Does the branch diff faithfully implement the requirements and architecture defined in `plan.md` and `concept.md`?
- **Edge Cases & Error Semantics**: Are null/empty states, network timeouts, and concurrent requests handled gracefully?
- **Behavioral Regressions**: Are invariants and existing caller expectations preserved?

### Lens B: Quality, Security & Performance Audit
- **Security & Hardening**: Parameterized queries, auth guards, IDOR prevention, secrets hygiene, and boundary validation.
- **Simplicity & Clean Code**: Chesterton's Fence, Rule of 500 (<500 lines), YAGNI, early returns, no speculative wrappers.
- **Performance**: N+1 database queries, un-memoized heavy operations, excessive re-renders, caching with appropriate TTLs.
- **Test Coverage**: Beyoncé Rule compliance, DAMP unit/integration tests passing 100%.

---

## 3. Review Output Format (Bilingual Hybrid)

Produce a structured markdown review report with Vietnamese explanations and English technical details:

```markdown
# Báo cáo Đánh giá Mã nguồn Pre-PR (5-Axis Review Report)

## 1. Tổng quan (Summary)
- **Branch Đánh giá**: `<current-branch>` so với `<base-branch>`
- **Số lượng File**: `N` files (`+X / -Y` lines)
- **Kích thước Thay đổi**: `Tối ưu (<200 lines)` | `Quá lớn (Cân nhắc tách nhỏ PR)`
- **Kết luận Chung**: `READY TO MERGE` (Sẵn sàng) | `CHANGES REQUESTED` (Cần sửa đổi) | `WARNINGS FOUND` (Có cảnh báo)

## 2. Ma trận Vấn đề Phát hiện (Findings Matrix)

| Mức độ (Severity) | Trục Đánh giá (Axis) | File | Vấn đề & Khuyến nghị Khắc phục cụ thể |
| :--- | :--- | :--- | :--- |
| 🔴 **BLOCKER** | Security (`security-and-hardening`) | `src/auth/guard.ts` | Thiếu kiểm tra phân quyền tenant ID (lỗ hổng IDOR). |
| 🟡 **WARNING** | Performance (`performance-optimization`) | `src/users/users.service.ts` | Nguy cơ truy vấn N+1 khi lặp qua danh sách roles. |
| 🔵 **SUGGESTION** | Simplicity (`code-simplification`) | `src/common/utils.ts` | Làm phẳng toán tử 3 ngôi lồng nhau bằng guard clauses. |
| ⚪ **NIT** | Quality (`code-review-and-quality`) | `src/users/dto.ts` | Sửa lỗi chính tả trong JSDoc comment. |

## 3. Các bước tiếp theo (Next Steps)
- Xử lý dứt điểm các mục 🔴 **BLOCKER** trước khi mở PR.
- Chạy `/only-one-pr-git` để tạo GitHub Pull Request sau khi hoàn tất kiểm tra.
```

---

## Guardrails

- **Enforce Bilingual Hybrid Report**: Author review narrative and recommendations in Vietnamese; preserve code symbols, file paths, severity labels, and snippet diffs in English.
- Focus on the code diff between `base-branch` and the current branch (`git diff <base-branch>...HEAD`), while verifying working tree state (`git status`) to ensure no uncommitted or untracked changes are overlooked.
- Categorize issues strictly by severity: `BLOCKER`, `WARNING`, `SUGGESTION`, `NIT`.
- Do not perform source code modifications during the review workflow.
