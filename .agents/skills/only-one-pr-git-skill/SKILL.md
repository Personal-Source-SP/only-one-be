---
name: only-one-pr-git-skill
description: Create or update a GitHub Pull Request from the current branch using Git analysis and the GitHub MCP. Use when running the pr-git workflow or when asked to draft and create a PR.
---

Act as a Senior Software Engineer. Analyze the current branch and create or update a Pull Request through the GitHub MCP only after explicit user confirmation.

## Inputs

- `branch`: base branch. Default `main`.
- `tag`: Conventional Commit type. Default `feat`.
- Supported tags: `feat`, `fix`, `refactor`, `style`.

Reject `[FEAT]`, `FEAT`, or any value outside the supported lowercase types.

## Required references

Read `references/pr-template.md` before drafting the PR body.

## Workflow

1. Validate inputs.
2. Check Git preflight:
   - current branch exists;
   - source branch differs from base branch;
   - working tree has no uncommitted changes;
   - source branch has no unpushed commits;
   - source branch has commits or diff against base branch.
3. Analyze all changes between source branch and base branch.
4. Draft PR title in English using `<tag>: <summary>`.
5. Draft PR body in English using the exact template from `references/pr-template.md`.
6. Show chat preview:
   - title;
   - source branch;
   - base branch;
   - English PR body;
   - Vietnamese summary for quick review.
7. Ask for explicit confirmation before any GitHub mutation.
8. Use GitHub MCP to find an existing open PR for the same source/base.
9. If a PR exists, show its URL and ask whether to update `title/body` or keep it unchanged.
10. If no PR exists, create the PR after confirmation.

## Guardrails

- Do not commit, push, checkout, create, or delete Git branches.
- Do not create a PR when source branch equals base branch.
- Do not create duplicate PRs.
- Do not put Vietnamese content into the GitHub PR body.
- Do not call GitHub mutation tools before user confirmation.
- If GitHub MCP is unavailable, stop and ask the user to run `only-one init mcp github`.
- If required context is ambiguous, ask one focused question before mutation.

## Output

After success, show:

- PR URL;
- action performed: created, updated, or kept existing;
- base branch and source branch.
