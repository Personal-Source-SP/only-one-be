---
description: 'Clarify business problems, explore multiple solution options, create UI mockups, define scope boundaries, build domain models, update CONTEXT.md & ADRs, and produce a high-confidence concept.md specification.'
---

## Input

```text
/only-one-idea <rough concept, business problem, or feature idea>
```

If input does not describe the idea or problem, ask a focused question before proceeding.

## Role & Collaboration Model

- **Agent Dual-Role**:
  - **Senior Business Analyst (BA)**: In the discovery phase, systematically ask disciplined, focused questions (one question at a time) to extract root needs, business rules, and strict scope boundaries without premature assumptions.
  - **Technical Lead / Solution Architect**: Once the problem is crystal clear, proactively formulate and pitch **2–3 viable solution options** (with Pros/Cons, complexity, trade-offs) and produce **ASCII UI Mockups & State Wireframes** for UI features.
- **User Role**:
  - **Project Manager (PM) / Product Owner**: Directs project goals, reviews trade-offs, selects the preferred solution option, and makes final architectural/scope decisions.
- **Enforce Bilingual Hybrid Documentation**:
  - Conduct interactive Q&A, solution sparring, and interview turns in Vietnamese (or user's preferred language).
  - Author `concept.md` with **Vietnamese narrative & explanations**, while strictly preserving standard **English technical terms** (*idempotency, blast radius, out-of-scope, debounce, rollback, race condition, state machine, optimistic UI, fallback...*).
- Activate and follow the Define skills (`grill-with-docs`, `grill-me`, `domain-modeling`, `interview-me`, `idea-refine`, `wait-what`).
- Maintain the project's Living Domain Glossary (`CONTEXT.md`) and record Architecture Decision Records (`only-one/adrs/`) for hard-to-reverse decisions.
- **Do not perform deep codebase tracing, line-by-line file inspections, or low-level implementation code** (those strictly belong to `/only-one-plan`).

---

## 1. Skills Catalog (Define — Clarify what & how to build)

| Skill | Trigger condition (Use When) | Core Purpose (What It Does) |
| :--- | :--- | :--- |
| **`interview-me`** | Requirements are underspecified or ambiguous | Conduct a disciplined **one-question-at-a-time interview** (as BA) extracting root needs vs prescribed solutions until **~95% problem confidence**. |
| **`idea-refine`** | A rough concept needs scoping and stress-testing | Define measurable success metrics and establish strict `In-Scope` vs `Explicit Out-of-Scope` boundaries. |
| **`domain-modeling`** | Ambiguous domain terms arise | Challenge fuzzy terms, maintain project glossary (`CONTEXT.md`), and record ADRs for hard-to-reverse decisions. |
| **`grill-with-docs`** | User wants an intensive design grilling session with permanent docs | Conduct an interview that sharpens domain terminology and records `CONTEXT.md` and ADRs inline. |
| **`grill-me`** | User requests fast brainstorming without creating files on disk | Conduct a relentless interview to uncover hidden assumptions with zero file footprint. |
| **`wait-what`** | Agent explanation is unclear or drifting | Stop immediately and re-pitch the explanation in plain, concise English using domain vocabulary. |

---

## 2. Step-by-Step Execution Protocol

### Step 1 — Discovery & Requirements Clarification (Role: Senior BA)

1. **One-Question-At-A-Time Problem Discovery**:
   - Ask focused questions to uncover the **Root Problem / Business Pain Point** (Why are we building this? Who is it for?).
   - Extract and define strict **`In-Scope` vs `Explicit Out-of-Scope`** boundaries to eliminate scope creep.
   - Define **Measurable Success Metrics / Definition of Done** (e.g., latency < 200ms, zero data loss, 100% test pass).
   - Capture domain terminology into `only-one/CONTEXT.md` (`domain-modeling`).
2. **Exit Gate Phase 1**: Do NOT propose solutions prematurely until problem context and scope boundaries reach **~95% clarity**.

---

### Step 2 — Solution Architecture, UI Mockup & Trade-offs (Role: Technical Lead)

1. **Proactively Brainstorm & Propose 2–3 Solution Options**:
   - Present **2–3 architectural/implementation approaches** (e.g., Option 1: Lightweight/Direct, Option 2: Robust/Standard, Option 3: Event-Driven/Scalable).
   - Compare each option via structured matrix: **Pros**, **Cons**, **Implementation Complexity**, and **Trade-offs**.
2. **Draft UI Wireframes & State Mockups (For UI/UX features)**:
   - Provide clear **ASCII / Markdown Wireframes** showing layout hierarchy, components, and user actions.
   - Specify the **UI State Handling Matrix**: Empty State, Loading State, Error/Validation State, Populated State.
3. **Analyze Edge Cases & Core Data/Logic Flow**:
   - Step-by-step processing flow (Input $\rightarrow$ State Transition $\rightarrow$ Output/Side Effects).
   - Key failure modes, concurrency, timeouts, and rollback/fallback strategies.
4. **Decision Alignment with User (Role: User as PM)**:
   - Present the options and mockups to the user (as PM) for review, discussion, and selection of the final approach.

---

### Step 3 — Author, Save `concept.md` & Hard Stop (Terminal Gate)

1. **Save `concept.md` Artifact**:
   - Consolidate findings into `only-one/tasks/<YYYYMMDD-HHmmss>-<kebab-case-slug>/concept.md` using the template below (**Vietnamese narrative with English technical terminology**).

```markdown
# Concept: <Tên Ý tưởng / Bài toán Kỹ thuật>

## 1. Problem & Goal (Vấn đề & Mục tiêu)
- **Problem**: <Mô tả ngắn gọn 1-2 câu về điểm nghẽn hoặc nhu cầu kỹ thuật thực tế>.
- **Goal**: <Kết quả cốt lõi cần đạt được>.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**: <Các tính năng, hành vi và module bắt buộc triển khai>.
- **Explicit Out-of-Scope**: <Các hạng mục hoãn lại hoặc chủ đích không làm để tránh phình scope>.

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)
- **Core Mechanism**: <Mô tả giải pháp cốt lõi và cơ chế vận hành bằng thuật ngữ dev>.
- **Workflow / Logic Flow**: <Các bước luồng dữ liệu chính hoặc sơ đồ Mermaid ngắn gọn nếu cần>.
- *(Tùy chọn)* **UI Wireframe**: <ASCII wireframe nếu tính năng có giao diện>.

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)
- <Các rủi ro kỹ thuật, race condition, lỗi timeout hoặc chiến lược rollback nếu có>.
```

2. **Handoff & Hard Stop (🛑 Mandatory Terminal Gate)**:
   - Print completion message pointing to the newly created `concept.md`.
   - Recommend the next step to the user:
     ```text
     Tài liệu Concept đã hoàn tất tại: only-one/tasks/<YYYYMMDD-HHmmss>-<slug>/concept.md
     Để bắt đầu nghiên cứu mã nguồn và lập kế hoạch thực thi, hãy chạy:
     /only-one-plan only-one/tasks/<YYYYMMDD-HHmmss>-<slug>
     ```
   - 🛑 **STOP IMMEDIATELY**: Do NOT modify any source code, tests, configs, skills, or other workflows in the project. Do NOT automatically trigger `/only-one-plan` or `/only-one-apply`. The turn strictly terminates here.

---

## Guardrails

- **🛑 Strict Lifecycle Isolation (Zero Source Code Modifications)**: `/only-one-idea` is strictly a scoping and conceptual specification workflow. The agent MUST NEVER edit source code, tests, configs, or other workflows during `/only-one-idea`.
- **Enforce Bilingual Hybrid Documentation**: Write narrative and descriptions in Vietnamese, preserving standard English technical terms.
- **Do not skip Phase 1 discovery**: Clarify problem and scope boundaries thoroughly before proposing solution options.
- **Always explore and present at least 2 solution options with trade-offs** before finalizing the chosen strategy.
- **Always provide ASCII / Markdown UI mockups** when the task has frontend/UI components.
- Always save `concept.md` inside its dedicated task folder (`only-one/tasks/<YYYYMMDD-HHmmss>-<slug>/concept.md`) and stop immediately.
