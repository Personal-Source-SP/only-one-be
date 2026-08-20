---
description: Validate, log Intranet timesheet entries, and output monthly summary using only-one-intranet-skill and zodinet-timesheet MCP.
---

Use skill `only-one-intranet-skill` to validate, preview, log work entries, and review timesheet balance through the configured `zodinet-timesheet` MCP server.

## Input

```text
/only-one-intranet --date <DD/MM/YYYY> --project <project-name> [--tasks-per-day <number>] [--validate]

[Carwash API] Implement task description | 9-13h
[Carwash Portal] Implement task description | 13-17h
```

- `--date` is required and MUST use `DD/MM/YYYY`.
- `--project` is required and MUST match an assigned Intranet project name.
- `--tasks-per-day` is optional. Default: `2`.
- `--validate` is optional and MUST prevent every mutation.
- Remaining non-empty lines after options are the task list.

## Required behavior

1. Load and follow skill `only-one-intranet-skill`.
2. Validate required options and task format before timesheet mutations.
3. Preview project, adjusted dates, slots, descriptions, replacements, skipped tasks, and total hours.
4. In `--validate` mode, stop after preview and validation result.
5. In log mode, wait for explicit user confirmation before deleting or creating entries.
6. After logging completes, query `get_my_timesheet_summary` and render the post-log summary report.

If skill `only-one-intranet-skill` or MCP `zodinet-timesheet` is unavailable, stop and tell the user to run `only-one init` or `only-one init mcp zodinet-timesheet`.
