---
alwaysApply: true
---

# CONTEXT & TOOLING

## Discovery

- Start from user-provided files and the narrowest relevant scope. Expand only when evidence shows the current scope is insufficient; never scan the repository without a concrete query.
- Before broad discovery or any multi-file change, inspect direct dependencies, callers, and blast radius. Trivial, isolated edits do not require it.
- Repository-wide exact-symbol search is allowed when needed to prove complete usage, compatibility, or removal safety.
- When Git Nexus MCP is installed and available, prefer its semantic repository search for discovery. Use local exact search as fallback when Git Nexus is unavailable or when exact-symbol proof is required.
- Evaluate Git Nexus search performance against the narrowest equivalent local search before relying on it for broad discovery. Record latency, result relevance, and scope covered; use the faster method when relevance and completeness are equivalent.
- When Git Nexus reports stale, missing, or incompatible analysis data, run `npx gitnexus analyze . --force --skip-agents-md` from repository root, then retry the Git Nexus operation. Do not treat stale graph results as current. If re-analysis fails, report its error and use narrow local search as fallback.

## Intent & Scope

- If critical details are missing, ambiguous, or conflicting, **stop and ask targeted clarifying questions before editing**. Do not infer requirements or choose product behavior on the user's behalf.
- Do not infer a business contract from one implementation. Validate against relevant schemas, constraints, tests, call sites, configuration, and confirmed user requirements.
- Modify only requested behavior and directly required supporting files, such as tests, types, exports, generated artifacts, snapshots, migrations, and lockfiles.
- Report unexpected scope expansion before editing; get approval when it adds product behavior or affects unrelated areas.

## Minimal Context

- Load only relevant targets, dependencies, callers, tests, fixtures, contracts, configuration, and runtime wiring.
- Prefer direct relationships first; expand only when evidence indicates indirect impact.
