---
name: only-one-nestjs-development
description: MUST use when creating, modifying, reviewing, or refactoring NestJS components (controllers, services, modules, ORM entities, DTOs, mappers, helpers, or unit tests). The agent MUST read this skill and selectively load ONLY relevant reference docs based on task type.
---

# NestJS Development Skill

## Directives for Context Efficiency (Lazy Loading Rules)

⚠️ **QUAN TRỌNG VỀ TIẾT KIỆM TOKEN**: Agent KHÔNG ĐỌC TOÀN BỘ CÁC FILE REFERENCE CÙNG LÚC.
Chỉ dùng `view_file` để đọc **đúng file reference** tương ứng với component đang làm việc dựa theo bảng điều hướng bên dưới.

### Bảng Điều Hướng Reference (Selective Reference Matrix)

| Nhiệm vụ / Component đang làm | File Reference duy nhất cần đọc (`view_file`) |
| :--- | :--- |
| **Controller / HTTP API / Route / Swagger / Auth** | [references/controller-architecture.md](references/controller-architecture.md) |
| **Service / Business Rules / Use Case / Exception** | [references/service-architecture.md](references/service-architecture.md) |
| **Entity / ORM Mapping / DB Constraint** | [references/entity-architecture.md](references/entity-architecture.md) & [references/mikro-orm.md](references/mikro-orm.md) |
| **Request Input DTO / Validation** | [references/request-dto-architecture.md](references/request-dto-architecture.md) |
| **Response DTO / API Serialization** | [references/response-dto-architecture.md](references/response-dto-architecture.md) |
| **AutoMapper Profile / Relation Mapping** | [references/mapping-profile-architecture.md](references/mapping-profile-architecture.md) |
| **Enum** | [references/enum-architecture.md](references/enum-architecture.md) |
| **Helper Function / Utility** | [references/helper-architecture.md](references/helper-architecture.md) |
| **Unit Test (`_tests/`)** | [references/test-architecture.md](references/test-architecture.md) |
| **DB Migration / Schema Change (MikroORM)** | [references/mikro-orm-migration.md](references/mikro-orm-migration.md) |
| **Tạo mới toàn bộ Feature Module** | [references/nestjs-architecture.md](references/nestjs-architecture.md) |

---

## Quick Workflow, Sáng Tạo & Phản Biện (Conflict Resolution)

💡 **Triết lý Bộ Skill**: Bộ Skill này là **quy chiếu tham chiếu ban đầu (baseline reference)**, KHÔNG PHẢI là quy chuẩn cứng nhắc áp đặt ở đầu ra. Agent được **khuyến khích chủ động đề xuất giải pháp mới, tối ưu hơn** dựa trên ngữ cảnh thực tế của bài toán.

1. **Tra cứu Quy chuẩn Ban đầu**:
   - Trước tiên đọc `package.json`, bootstrap, module layout, test setup và xác định ORM, validation, logger, auth, transaction convention của project.
   - Existing project conventions thắng khi không làm yếu correctness, security hoặc yêu cầu rõ ràng.
   - Agent tra bảng điều hướng và mở file reference tương ứng với component đang làm việc (ví dụ: làm Controller -> chỉ mở `references/controller-architecture.md`).

2. **Khuyến Khích Sáng Tạo, Phản Biện & Trao Đổi (Agent Reflection)**:
   - Sau khi đọc file reference, nếu Agent:
     - **Nghĩ ra giải pháp mới tối ưu hơn**: Kiến trúc gọn gàng hơn, hiệu năng tốt hơn hoặc sạch hơn so với quy chuẩn ban đầu.
     - **Phát hiện mâu thuẫn**: Quy chuẩn trong Skill bị chênh lệch với thực tế codebase hoặc yêu cầu của người dùng.
   - Agent **ĐƯỢC KHUYẾN KHÍCH PHẢN BIỆN**, chủ động trao đổi với người dùng theo quy trình của Skill [grill-me](../grill-me/SKILL.md) để thảo luận:
     - **Đề xuất giải pháp mới & Cập nhật Skill con**: Áp dụng giải pháp cải tiến mới và cập nhật lại nội dung quy chuẩn trong file `references/*.md` tương ứng.
     - **Điều chỉnh cách thực hiện**: Sửa lại thiết kế code cho khớp với quy chuẩn hiện tại nếu người dùng muốn giữ nguyên kiến trúc ban đầu.
     - **Dừng lại**: Hủy hoặc dừng thực hiện task nếu không đạt được thống nhất.

3. **Thực thi**:
   - Chỉ tiến hành viết/sửa code sau khi đã giải quyết mâu thuẫn hoặc chốt được giải pháp mới với người dùng.
