---
description: Compact current conversation and task state into a seamless handoff document for agent switching or context refreshment.
---

## Input

```text
/only-one-handoff [<target-task-folder>]
```

- If `<target-task-folder>` is omitted, automatically detect the active in-progress task in `only-one/tasks/`.

## Role

You are a **Session Continuity Coordinator**. Your core responsibilities:
- Compact the current working memory, active task progress, key decisions, and immediate next steps into a single, high-signal handoff document (`handoff.md`).
- Ensure another agent or future session can resume work immediately without losing momentum or repeating questions.

## Purpose

Prevent context loss when the context window is near capacity or when transitioning between different models or sessions.

---

## 1. Skills Catalog (Productivity & Session Continuity)

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`handoff`** | Session context is heavy, task needs transfer, or switching agent models | Compact current conversation state into a structured Markdown handoff document. |

---

## 2. Step-by-Step Execution Protocol

### Step 1 — Detect Active Task & Progress
1. Find the active task folder (e.g., `only-one/tasks/<YYYYMMDD-HHmmss>-<slug>/`).
2. Inspect `plan.md` to see which files in Section 3 are completed and which are pending.
3. Review recent Git status (`git status`, `git diff --stat`) to observe uncommitted changes.

---

### Step 2 — Generate `handoff.md` (Song ngữ Lai)

Save the handoff artifact directly inside the active task folder (**Diễn giải bằng Tiếng Việt + thuật ngữ Tiếng Anh**):
```
only-one/tasks/<active-task-folder>/handoff.md
```

Using the structured template:

```markdown
# Tài liệu Bàn giao Phiên làm việc (Session Handoff Document)

## 1. Mục tiêu Cốt lõi & Phạm vi (Core Objective & Scope)
- **Mã Task**: `<kebab-case-slug>`
- **Mục tiêu**: <Tóm tắt 1-2 câu về những gì đang xây dựng/sửa đổi>
- **Tài liệu Kế hoạch**: `plan.md` (Trạng thái: `in-progress`)

## 2. Tiến độ Hiện tại & Các phần Đã Xong (Current Progress)
- **Các file đã sửa đổi & nghiệm thu**:
  - `path/to/file1.ts` (Hoàn thành & đã test)
  - `path/to/file2.ts` (Hoàn thành & đã test)
- **Trạng thái Kiểm thử**: <Tóm tắt kết quả unit/integration tests>

## 3. Bước Tiếp theo Cần làm Ngay (Immediate Next Step)
- **File Mục tiêu**: `path/to/next_file.ts` (Order: X trong Section 3 của plan.md)
- **Hành động Cần thực hiện**: <Hàm hoặc interface cụ thể cần implement tiếp>
- **Lệnh Test Nhanh**: `<npm test path/to/test.ts>`

## 4. Quyết định Then chốt, Bẫy ngầm & Ràng buộc (Gotchas & Invariants)
- <Các quyết định thiết kế quan trọng đưa ra trong session>
- <Bẫy ngầm hoặc quy tắc âm cần tuân thủ>
- <Ghi chú hoặc câu hỏi còn mở cho Agent tiếp quản>
```

---

## 3. Confirmation

Inform the user that the handoff document is ready and the next agent can resume work seamlessly with `/only-one-apply`.

---

## Guardrails

- **Enforce Bilingual Hybrid Handoff**: Write the handoff narrative in Vietnamese while preserving technical terms and file paths in English.
- Keep `handoff.md` concise, structured, and high-signal.
- Always include the exact next file, order number, and fast test command.
