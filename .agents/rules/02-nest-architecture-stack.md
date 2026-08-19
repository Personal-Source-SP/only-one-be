---
alwaysApply: true
---

# RULE 2: ARCHITECTURE, TYPES & CONTRACTS

## 1. Project Evidence First

- MUST inspect package scripts, `tsconfig`, module aliases, test setup, and existing architecture/type conventions before edits.
- MUST follow established project boundaries and naming unless an approved design explicitly changes them.
- MUST keep scope bounded to requested behavior. Do not introduce unrelated restructuring or a new convention.

## 2. TypeScript & Runtime Safety

- MUST maintain strict TypeScript and `noImplicitAny` expectations. Do not use undocumented `any`; prefer explicit types, generics, or validated `unknown` with proper narrowing.
- MUST use named interfaces, classes, or type aliases for public request and response boundaries. Avoid anonymous inline contracts when a named contract improves reuse or review.
- MUST Validate untrusted input at runtime boundaries. Never assert away uncertain runtime data.
- MUST use domain vocabulary consistently for entities, types, methods, and functions when the project defines a ubiquitous language.

## 3. Ownership & Public Contracts

- MUST keep business, transport, persistence, presentation, and infrastructure responsibilities separated according to existing project architecture.
- MUST keep units small, single-responsibility, independently understandable, and testable through clear interfaces.
- MUST reuse existing public contracts rather than manually duplicating equivalent definitions.
- MUST preserve public contracts. Intentional breaking changes require explicit approval, before/after contract evidence, migration or compatibility plan, and tests.
- MUST preserve dependency injection, ownership, validation, transaction, error, and logging boundaries established by the project.

## 4. Framework Skills

- MUST read and follow `only-one-nestjs-development/SKILL.md` before creating or modifying NestJS controllers, services, modules, ORM repositories, entities, DTOs, validation, or backend error handling.

## 5. Quality & Verification

- SHOULD use TDD for behavior changes and bug fixes.
- MUST test observable behavior rather than implementation details when possible.
- MUST run relevant focused tests and typecheck before reporting completion; run broader checks required by approved scope.
- MUST report every skipped check and reason. Never claim verification without fresh evidence.
