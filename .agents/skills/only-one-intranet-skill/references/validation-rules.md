# Intranet Validation, Replacement, and Reporting Rules

## Required options

- `--date` is required and must use `DD/MM/YYYY`.
- `--project` is required and must match an assigned Intranet project name.
- `--tasks-per-day` is optional, must be a positive integer, and defaults to `2`.

## Allocation

- Preserve input order.
- Start from `--date`.
- If start date is Saturday or Sunday, move to next Monday.
- Allocate at most `tasks-per-day` tasks per working day.
- Move the next group to the next working day.
- Skip Saturday and Sunday.
- Explicit day groups that exceed `tasks-per-day` are skipped in log mode and reported as errors in validate mode.

## Project resolution

- Search assigned projects using `list_my_projects`.
- Match against `name` or `code` (case-insensitive fallback if exact match missing).
- If no matching project is found, stop and list the user's assigned projects.

## Preview

Preview must show:

- project name and ID;
- original start date;
- adjusted start date when changed;
- each task date, slot, and description;
- entries that will be replaced;
- skipped tasks and reasons;
- total hours.

## Replacement

- Query existing entries in range via `list_my_time_entries`.
- Match existing entries by date and slot.
- Keep unrelated entries unchanged.
- Snapshot old entry data before deletion.
- Delete matching old entries via `delete_time_entry` before creating the replacement.
- Create new entries via `bulk_log_time` (or `log_time`).
- If creation fails after deletion, restore old entries immediately from snapshots.
- Stop the batch after restore attempt and report restored, unrestored, and unprocessed tasks.

## Validate mode

`--validate` only validates and previews. It must not delete, create, or update Intranet entries.

## Post-Logging Summary Report

After tasks are successfully logged in log mode, call `get_my_timesheet_summary` and display a Markdown summary table:

```markdown
### 📊 Timesheet Summary Report (Tháng MM/YYYY)

| Chỉ số | Giá trị |
| :--- | :--- |
| **Tổng số giờ vừa log** | `<logged_hours>h` (<count> tasks) |
| **Tổng giờ làm trong tháng (Net Time)** | `<net_time>h` / `<target_time>h` (<percentage>%) |
| **Trạng thái kỳ tính lương** | 🟢 Đang mở (Open) / 🔒 Đã khóa (Finalized) |

✅ **Tất cả các task đã được ghi nhận thành công lên hệ thống Intranet.**
```
