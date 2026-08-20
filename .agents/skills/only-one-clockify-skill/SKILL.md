---
name: only-one-clockify-skill
description: Validate and log Clockify time entries from task lines using the Clockify MCP. Use when running the clockify workflow or when asked to log tasks to Clockify.
---

Use the Clockify MCP to validate, preview, and optionally log task time entries. Never mutate Clockify in `--validate` mode.

## Inputs

- `date`: required, format `DD/MM/YYYY`.
- `project`: required, exact Clockify project name.
- `tasks-per-day`: optional positive integer. Default `2`.
- `validate`: optional boolean. When true, preview only.
- Task list: remaining non-empty lines after the command options.

## Required references

Read these before processing tasks:

- `references/task-format.md`
- `references/validation-rules.md`

## Workflow

1. Validate command options and task list shape.
2. Resolve Clockify project by exact name.
3. If multiple workspaces contain the exact project name, ask the user to select one.
4. If prompt is unavailable and workspace is ambiguous, stop and list candidates.
5. Parse task lines and allocate them to weekdays from `date`.
6. If `date` is Saturday or Sunday, shift start date to the next Monday and show both original and adjusted dates.
7. Find existing entries matching workspace, project, date, and slot.
8. Show preview:
   - workspace;
   - project;
   - original and adjusted date;
   - tasks to log;
   - skipped tasks;
   - entries to replace;
   - total hours.
9. In `--validate` mode, stop after preview and errors. Do not delete or create entries.
10. In log mode, ask for explicit confirmation once.
11. For each confirmed task, delete only matching entries, then create a new billable entry.
12. If replacement creation fails after deletion, immediately restore old entries from snapshots, stop the batch, and report restored, unrestored, and unprocessed tasks.

## Guardrails

- Do not mutate Clockify before preview and confirmation.
- Do not log weekends.
- Do not guess project when exact match is missing.
- Do not choose the first workspace when multiple exact matches exist.
- Do not delete entries outside `workspace + project + date + slot`.
- Do not continue batch after restore failure or inconsistent state.
- If Clockify MCP is unavailable, stop and ask the user to run `only-one init mcp clockify`.
