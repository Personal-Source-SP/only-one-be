---
description: Create or update a GitHub PR from current branch using only-one-pr-git-skill and GitHub MCP.
---

Use skill `only-one-pr-git-skill` to create or update a GitHub Pull Request through the configured `github` MCP server.

## Input

```text
/only-one-pr-git --branch <base-branch> --tag <conventional-type>
```

- `--branch` is optional. Default: `main`.
- `--tag` is optional. Default: `feat`.
- `--tag` MUST be one of: `feat`, `fix`, `refactor`, `style`.
- Reject bracketed or uppercase tags such as `[FEAT]` or `FEAT`.

## Required behavior

1. Load and follow skill `only-one-pr-git-skill`.
2. Validate options before any GitHub MCP mutation.
3. Use the current Git branch as source branch.
4. Use `--branch` as base branch.
5. Use `--tag` as Conventional Commit type for the PR title.
6. Show PR preview and wait for explicit user confirmation before create/update.

If skill `only-one-pr-git-skill` or MCP `github` is unavailable, stop and tell the user to run `only-one init` or `only-one init mcp github`.

