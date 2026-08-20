# Helper Architecture

## Trách nhiệm & Vị trí

Helper chứa các hàm pure-function độc lập với Dependency Injection, phục vụ các thao tác kỹ thuật thuần túy (format, parse, sanitize, normalize).

- **Vị trí**: `src/modules/<feature>/helpers/`

## Code mẫu

```ts
export const normalizeCode = (value?: string): string | undefined => {
  const normalized = value?.trim().toUpperCase();
  return normalized || undefined;
};
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Pure Functions & Utility Scoped**:
  - Input/Output rõ ràng, không có side-effect.
  - Chỉ xử lý các tác vụ kỹ thuật thuần túy: format string, parse data, sanitize HTML, validation độc lập.
  - Xử lý ngày tháng dùng `dayjs` (dùng `dayjs.isBefore`, `dayjs.isAfter`, `dayjs.diff`, không dùng `new Date()` với các toán tử so sánh). Khi thao tác với múi giờ cụ thể hoặc UTC, phải kiểm tra việc mở rộng plugins Timezone (`dayjs.extend(utc)`, `dayjs.extend(timezone)`).
  - Ưu tiên sử dụng các utility functions có sẵn của **`lodash`** (như `isEmpty`, `get`, `set`, `uniq`, `groupBy`, `keyBy`, `cloneDeep`, `omit`, `pick`,...) thay vì tự viết lại code thủ công.
  - Rẽ nhánh theo Enum/Union type dùng `switch/case`.
  - BẮT BUỘC lưu kết quả tính toán/biến đổi vào biến rõ nghĩa trước khi `return` (ví dụ: `const result = ...; return result;`), không `return` trực tiếp biểu thức lồng phức tạp để dễ dàng debug.
  - Phải có unit test tương ứng trong `helpers/_tests/`.
- ❌ **Không chứa Business Rule hay DI**:
  - Không inject Repository, Controller, EntityManager hay Request Context vào Helper.
  - Không chứa business rules (tính giá, phân quyền, kiểm tra trạng thái workflow) — những logic này phải nằm ở Service.
  - Không tạo Helper cho các hàm private quá ngắn chỉ sử dụng ở một vị trí duy nhất trong Service.
