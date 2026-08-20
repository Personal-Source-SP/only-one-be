# Clockify Validation and Replacement Rules

## Required options

- `--date` is required and must use `DD/MM/YYYY`.
- `--project` is required and must match a project name exactly.
- `--tasks-per-day` is optional, must be a positive integer, and defaults to `2`.

## Allocation

- Preserve input order.
- Start from `--date`.
- If start date is Saturday or Sunday, move to next Monday.
- Allocate at most `tasks-per-day` tasks per working day.
- Move the next group to the next working day.
- Skip Saturday and Sunday.
- Explicit day groups that exceed `tasks-per-day` are skipped in log mode and reported as errors in validate mode.

## Project and workspace

- Search projects by exact name.
- If no exact match exists, stop and show similar names.
- If exactly one workspace contains the project, use it.
- If multiple workspaces contain the exact project name, ask user to choose.
- If no prompt is available for ambiguous workspace, stop and list candidates.

## Preview

Preview must show:

- workspace;
- project;
- original start date;
- adjusted start date when changed;
- each task date, slot, description, and billable status;
- entries that will be replaced;
- skipped tasks and reasons;
- total hours.

## Replacement

- Match existing entries by workspace, project, date, and slot.
- Keep unrelated entries unchanged.
- Snapshot old entry data before deletion.
- Delete matching old entries before creating the replacement.
- Create every new entry as billable.
- If creation fails after deletion, restore old entries immediately.
- Stop the batch after restore attempt and report restored, unrestored, and unprocessed tasks.

## Validate mode

`--validate` only validates and previews. It must not delete, create, or update Clockify entries.
