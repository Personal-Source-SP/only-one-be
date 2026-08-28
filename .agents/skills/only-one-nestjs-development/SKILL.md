---
name: only-one-nestjs-development
description: MUST use when creating, modifying, reviewing, or refactoring NestJS components (controllers, services, modules, ORM entities, DTOs, mappers, helpers, or unit tests). The agent MUST read this skill and selectively load ONLY relevant reference docs based on task type.
---

# NestJS Development Skill

## 0. Mandatory Reuse-First Invariant (Anti-Reinvention Rules)

> [!IMPORTANT]
> **MANDATORY AUDIT BEFORE WRITING NEW CODE**:
> 1. **Pre-Implementation Codebase Audit**:
>    - Before creating any Helper, Utility, Custom Decorator, DTO, Mapper, Exception Class, or Service Method, the Agent MUST audit (`grep_search` or `list_dir`) the following directories:
>      - `src/common/`, `src/shared/`, `src/utils/`, `src/helpers/`, `src/decorators/`
>      - Sibling feature modules sharing similar domain concerns.
> 2. **Strict Anti-Reinvention**:
>    - NEVER re-implement string manipulation, date formatting, password hashing, currency formatting, object mapping, or query parsing if equivalent utilities already exist.
>    - NEVER write ad-hoc inline logic in Service/Controller when a Base Service, Shared Helper, or ORM Repository method already serves that purpose.
> 3. **Open/Closed Extension**:
>    - If an existing function/helper lacks a minor option, extend it (e.g., add an optional parameter) rather than creating a duplicate utility.

---

## Directives for Context Efficiency (Lazy Loading Rules)

> [!WARNING]
> **TOKEN EFFICIENCY DIRECTIVE**: The Agent MUST NOT read all reference files simultaneously.
> Use `view_file` to read **ONLY the single relevant reference file** corresponding to the active task based on the routing matrix below.

### Selective Reference Routing Matrix

| Task / Component in Progress | Dedicated Reference File to Read (`view_file`) |
| :--- | :--- |
| **Controller / HTTP API / Route / Swagger / Auth** | [references/controller-architecture.md](references/controller-architecture.md) |
| **Service / Business Rules / Use Case / Exception** | [references/service-architecture.md](references/service-architecture.md) |
| **Entity / ORM Mapping / DB Constraint** | [references/entity-architecture.md](references/entity-architecture.md) & [references/mikro-orm.md](references/mikro-orm.md) |
| **Request Input DTO / Validation** | [references/request-dto-architecture.md](references/request-dto-architecture.md) |
| **Response DTO / API Serialization** | [references/response-dto-architecture.md](references/response-dto-architecture.md) |
| **AutoMapper Profile / Relation Mapping** | [references/mapping-profile-architecture.md](references/mapping-profile-architecture.md) |
| **Enum Definition** | [references/enum-architecture.md](references/enum-architecture.md) |
| **Helper Function / Utility** | [references/helper-architecture.md](references/helper-architecture.md) |
| **Unit Test (`_tests/`)** | [references/test-architecture.md](references/test-architecture.md) |
| **DB Migration / Schema Change (MikroORM)** | [references/mikro-orm-migration.md](references/mikro-orm-migration.md) |
| **Entire Feature Module Creation** | [references/nestjs-architecture.md](references/nestjs-architecture.md) |
| **Shared Composition / Cross-Module Reuse** | [references/composition-shared-architecture.md](references/composition-shared-architecture.md) |

---

## Quick Workflow, Innovation & Conflict Resolution

> [!NOTE]
> **Skill Philosophy**: This skill suite serves as a **baseline reference**, not a rigid constraint. The Agent is **encouraged to propose innovative and optimized solutions** tailored to real-world domain requirements.

1. **Inspect Baseline Conventions**:
   - First inspect `package.json`, bootstrap entry point, module layout, and test setup to detect the project's ORM, validation library, logger, auth, and transaction conventions.
   - Existing project conventions take precedence when they do not compromise correctness, security, or explicit requirements.
   - Look up the routing matrix above and open ONLY the reference file corresponding to the component in progress (e.g., working on Controller -> open only `references/controller-architecture.md`).

2. **Proactive Reflection & Constructive Challenge**:
   - After inspecting the reference file, if the Agent:
     - **Discovers a superior approach**: A cleaner architecture, higher performance, or more maintainable structure than the baseline standard.
     - **Identifies discrepancies**: Conflicts between skill guidelines and the active codebase or user specifications.
   - The Agent is **ENCOURAGED TO CHALLENGE ASSUMPTIONS** and interact with the user via [grill-me](../grill-me/SKILL.md) to align:
     - **Adopt Improved Solution & Update Skill Docs**: Apply the enhanced architecture and update the relevant `references/*.md` file.
     - **Align with Existing Standards**: Adjust the code implementation to follow the established architecture if the user prefers maintaining consistency.
     - **Halt Execution**: Abort or pause the task if consensus cannot be reached.

3. **Execution**:
   - Write and modify code only after resolving architectural ambiguities or confirming the proposed approach with the user.
