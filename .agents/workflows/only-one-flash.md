---
description: "Execute small, rapid tasks with zero disk plan footprint, clean in-chat plan, user confirmation review gate, strict rule/skill compliance, and fast verification."
---

## Input

```text
/only-one-flash <change description, bug fix, or quick task>
```

If input is missing or empty, ask the user to provide a brief description of the task.

## Role

You are a **Senior Software Engineer** executing high-speed, high-precision code modifications. Your core responsibilities:
- Perform rapid, targeted codebase research without generating task folders or markdown planning files on disk (**Zero Disk Plan Footprint**).
- Output an ultra-clean, structured plan directly into the chat response and **pause for user confirmation/feedback** before applying code changes (containing only **Mô tả**, **Target Structure** ASCII tree with brief descriptions and AST seams, and **Verification**).
- Ingest and strictly enforce `only-one/rules.md`, relevant `only-one/archives/*.md`, `only-one/CONTEXT.md`, and framework-specific skills (`SKILL.md`) in working memory without cluttering the chat output.
- Apply code modifications in thin, clean slices adhering to project coding conventions, YAGNI, and the Reuse-First Invariant.
- Run the targeted test/typecheck command immediately and provide a concise summary walkthrough.

## Purpose

Provide a rapid fast-track lane for micro-tasks and hotfixes, combining the research discipline of `/only-one-plan` with the execution rigor of `/only-one-apply` while maintaining an interactive confirmation review gate before modifying code.

---

## Mandatory Output Skill

Before emitting the Flash Plan, read and activate `i-have-adhd`; keep it active throughout this workflow.

`i-have-adhd` is a presentation adapter, not an execution policy. Priority: safety → workflow lifecycle, gates, artifacts, and order → domain-skill completeness and evidence → ADHD-friendly formatting → generic style. Preserve domain-skill completeness, Zero Disk Plan Footprint, mandatory Review Gate, source evidence, and verification. Structured plans, tables, and code blocks are exempt from prose list limits.

## 1. Skills Catalog (Fast-Track Execution Disciplines)

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`i-have-adhd`** | Every user-visible turn | Action-first progress output without changing review gates, execution, or verification. |
| **`context-engineering`** | Step 1 (Ingesting rules & skills) | Load only the essential negative rules in `only-one/rules.md`, relevant `archives/`, and framework skills into working memory. |
| **`incremental-implementation`** | Step 3 (Applying file changes) | Apply precise code edits adhering to type contracts, safe defaults, and clean diffs. |
| **`code-simplification`** | Step 3 (Quality Gate) | Eliminate dead code, unused imports, speculative abstractions, and keep cognitive complexity low (YAGNI). |
| **`test-driven-development`** | Step 4 (Verification) | Enforce the Beyoncé Rule (*"If you changed behavior, you must verify it with a test"*), running fast targeted test commands. |
| **`diagnosing-bugs`** | When any test or compiler error occurs | Execute disciplined Red Feedback Loops (Reproduce $\rightarrow$ Localize $\rightarrow$ Hypothesize $\rightarrow$ Fix) without guessing. |
| **`ponytail`** | Step 1 research and before approved edits | Make concise per-file reuse/new-code decisions and revalidate them before editing. |

---

## 2. Step-by-Step Execution Protocol

### Step 1 — Rapid Seam, Governance & Target Rules Ingestion (Internal)

1. **Target Files & Reuse-First Audit**:
   - Identify target files and symbols using `grep_search` or `list_dir`.
   - Perform **Mandatory Reuse-First Audit**: Check `src/utils/`, `src/helpers/`, `src/hooks/`, `src/common/`, `src/components/` to reuse existing utilities and avoid duplicate logic.
2. **Only-One Governance Ingestion**:
   - Read `only-one/rules.md` to strictly enforce mandatory negative rules (`[NEVER]`, `[ALWAYS]`, `[AVOID]`).
   - Search and read ONLY the relevant `only-one/archives/*.md` matching the domain/module of the target files to understand past architectural invariants.
   - Check `only-one/CONTEXT.md` for domain terminology.
3. **Target-Driven Tech Skills & Rules**:
   - Match target files with their technology stack (e.g., `src/modules/*/*.service.ts` $\rightarrow$ `nestjs-development`, React components $\rightarrow$ UI rules).
   - Read `.agents/rules/` and `SKILL.md` of ONLY the matched framework skills. ❌ Do NOT bulk-load unrelated skills.

---

### Step 2 — Emit In-Chat Plan & Review Gate (🛑 Mandatory Pause)

1. Emit a clean, focused Markdown plan directly in the chat output:

```markdown
⚡ **Flash Plan**:
- **Mô tả**:
  - <Gạch đầu dòng 1: Tóm tắt giải pháp / mục tiêu chính>
  - <Gạch đầu dòng 2: Cơ chế kỹ thuật hoặc điểm lưu ý nếu có nhiều ý>
- **Target Structure**:
```text
src/path/to/module/
├── [MODIFY] target.service.ts        # Seam: methodName() - Thêm logic xử lý
├── [NEW]    dto/target-filter.dto.ts # Class: TargetFilterDto - Validate input params
└── [DELETE] legacy.helper.ts         # Xóa helper cũ deprecated
```
- **Verification**: `<Fast Test / Lint / Build Command>`
```

*(Lưu ý: Nếu phần `Mô tả` chỉ có đúng 1 ý ngắn gọn duy nhất, có thể viết inline trên cùng dòng `- **Mô tả**: <Nội dung>`, nhưng khi có từ 2 ý trở lên thì bắt buộc tách thành các gạch đầu dòng con để tăng tính trực quan).*

*(🛑 Do NOT display loaded skills or governance metadata in chat. Do NOT create `only-one/tasks/`, `concept.md`, or `plan.md` on disk).*

2. 🛑 **MANDATORY REVIEW GATE — Pause for User Confirmation**:
   - Stop immediately after emitting the Flash Plan. Do NOT apply code changes in this turn.
   - Guide the user: *"Kế hoạch thực hiện nhanh đã sẵn sàng ở trên. Bạn có thể góp ý/nhận xét hoặc xác nhận để tiến hành chỉnh sửa mã nguồn."*
   - Wait for the user's explicit confirmation (e.g., *"xác nhận"*, *"tiến hành"*, *"ok"*, *"apply"*) or adjustments before proceeding to Step 3.

---

### Step 3 — Direct Strict Apply (Upon Confirmation)

1. Once the user confirms the plan:
   - Apply code changes using `replace_file_content` or `multi_replace_file_content`.
2. **Strict Quality Invariants**:
   - 100% compliance with `only-one/rules.md` and loaded framework skills.
   - No dead code, orphan imports, temporary console logs, or speculative abstractions.
   - Preserve exact existing repository formatting and conventions.

---

### Step 4 — Fast Verification & Walkthrough

1. Execute the fast test command (e.g., `npm test -- <test-file>`, `npm run build`, or typecheck) to verify zero regressions.
2. If errors occur, diagnose and resolve them following `diagnosing-bugs`.
3. Provide a brief completion summary in chat (1–3 sentences) highlighting what was changed and the test result.

