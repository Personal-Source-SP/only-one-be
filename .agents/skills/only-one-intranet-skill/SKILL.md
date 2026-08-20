---
name: only-one-intranet-skill
description: Validate and log Intranet timesheet entries from task lines using the zodinet-timesheet MCP. Use when running the only-one-intranet workflow or when asked to log tasks to Intranet.
---

Use the `zodinet-timesheet` MCP to validate, preview, optionally log task time entries, and render post-logging balance summaries. Never mutate timesheet in `--validate` mode.

## Inputs

- `date`: required, format `DD/MM/YYYY`.
- `project`: required, assigned Intranet project name.
- `tasks-per-day`: optional positive integer. Default `2`.
- `validate`: optional boolean. When true, preview only.
- Task list: remaining non-empty lines after the command options.

## Required references

Read these before processing tasks:

- `references/task-format.md`
- `references/validation-rules.md`

## Workflow

1. Validate command options and task list shape.
2. Resolve Intranet project by querying `list_my_projects`.
3. If no matching project is found, stop and list the user's assigned projects.
4. Query existing entries via `list_my_time_entries` for the target date range.
5. Parse task lines and allocate them to weekdays from `date`.
6. If `date` is Saturday or Sunday, shift start date to the next Monday and show both original and adjusted dates.
7. Identify existing entries matching date and slot for replacement.
8. Show preview:
   - project name and ID;
   - original and adjusted date;
   - tasks to log;
   - skipped tasks;
   - entries to replace;
   - total hours.
9. In `--validate` mode, stop after preview and errors. Do not delete or create entries.
10. In log mode, ask for explicit confirmation once.
11. Snapshot old entries. For each confirmed replacement, delete matching old entries via `delete_time_entry`, then create new entries via `bulk_log_time` (or `log_time`).
12. If replacement creation fails after deletion, immediately restore old entries from snapshots, stop the batch, and report restored, unrestored, and unprocessed tasks.
13. After logging completes, query `get_my_timesheet_summary` and display the formatted Post-Logging Summary Report table.

## Guardrails

- Do not mutate timesheet before preview and confirmation.
- Do not log weekends.
- Do not guess project when no assigned match exists.
- Do not delete entries outside target date + slot.
- Do not continue batch after restore failure or inconsistent state.
- If `zodinet-timesheet` MCP is unavailable, stop and ask the user to run `only-one init mcp zodinet-timesheet`.
