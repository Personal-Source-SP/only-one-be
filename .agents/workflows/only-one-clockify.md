---
description: Validate and log Clockify tasks using only-one-clockify-skill and Clockify MCP.
---

Use skill `only-one-clockify-skill` to validate or log Clockify time entries through the configured `clockify` MCP server.

## Input

```text
/only-one-clockify --date <DD/MM/YYYY> --project <project-name> [--tasks-per-day <number>] [--validate]

[Carwash API] Implement task description | 9-13h
[Carwash Portal] Implement task description | 13-17h
```

- `--date` is required and MUST use `DD/MM/YYYY`.
- `--project` is required and MUST match a Clockify project name exactly.
- `--tasks-per-day` is optional. Default: `2`.
- `--validate` is optional and MUST prevent every mutation.
- Remaining non-empty lines after options are the task list.

## Required behavior

1. Load and follow skill `only-one-clockify-skill`.
2. Validate required options and task format before Clockify mutations.
3. Preview project, workspace, adjusted dates, slots, descriptions, replacements, skipped tasks, and total hours.
4. In `--validate` mode, stop after preview and validation result.
5. In log mode, wait for explicit user confirmation before deleting or creating entries.

If skill `only-one-clockify-skill` or MCP `clockify` is unavailable, stop and tell the user to run `only-one init` or `only-one init mcp clockify`.

