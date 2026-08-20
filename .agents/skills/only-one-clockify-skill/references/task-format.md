# Clockify Task Format

Each non-empty line is one task:

```text
[Carwash API] Implement fundamental CRUD services. | 9-13h
[Carwash Portal] Build wash modes management. | 13-17h
```

## Grammar

```text
[Label] Description | start-endh
```

- Description sent to Clockify is the exact trimmed text before the first `|`.
- Slot is the exact trimmed text after the first `|`.
- Ignore empty lines.
- Fail validation when a line has no `|`, empty description, or invalid slot.

## Slot parsing

- `9-13h` means `09:00-13:00`.
- `13-17h` means `13:00-17:00`.
- Timezone is `Asia/Ho_Chi_Minh` / GMT+7.
- End time must be after start time.
- Tasks allocated to the same day must not overlap.
