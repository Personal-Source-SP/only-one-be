# Enum Architecture

## Trách nhiệm & Vị trí

Enum đại diện cho tập giá trị domain hữu hạn, cố định, tái sử dụng giữa Entity, DTO và Service.

- **Vị trí**: `src/modules/<feature>/enums/<domain>.enum.ts`

## Code mẫu

```ts
export enum FeatureStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Sử dụng Type-Safe Enum**:
  - Dùng String Enum với giá trị rõ ràng, ổn định.
  - Sử dụng Enum type trong Entity và Service thay cho magic string.
  - Trong DTO, sử dụng `@EnumField()` hoặc `@EnumFieldOptional()`.
- ❌ **Không chứa Logic hay Dynamic Data**:
  - Không đặt I/O, DB query hay logic xử lý bên trong Enum.
  - Không dùng Enum cho dữ liệu động mà Admin/User có thể thêm/bớt qua DB (những dữ liệu đó phải là Lookup Table / Entity).
