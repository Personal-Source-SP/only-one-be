# Concept: Áp dụng Bộ Decorators Chuẩn Hoá vào Toàn bộ Modules của Only-One-BE

## 1. Problem & Goal (Vấn đề & Mục tiêu)
- **Problem**: Hiện tại các module trong `src/modules` (`auth`, `user`, `data-provider`, `setting`, `schedule`, `simulation`, `google`, `notification`, `audit-log`...) đang sử dụng cách khai báo DTO và Controller thủ công, rườm rà (`@ApiProperty()`, `@IsString()`, `@IsNotEmpty()`, `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`). Điều này gây lặp code, thiếu tính năng auto-trim, và khó bảo trì đồng bộ giữa Swagger docs và validation logic.
- **Goal**: Áp dụng toàn diện bộ 5 nhóm decorators mới (`src/decorators/`) vào các DTOs và Controllers trong `src/modules`, giúp giảm thiểu ~60-70% boilerplate code, tự động chuẩn hoá `@Trim()` cho toàn bộ chuỗi ký tự, và đồng nhất hoá cơ chế bảo vệ endpoint bằng `@Auth()`, `@UUIDParam()`.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  1. **DTOs Refactoring (Field & Transform Decorators)**:
     - Chuyển đổi toàn bộ Request/Response DTOs trong `src/modules/*/dtos/` sang sử dụng `@StringField`, `@NumberField`, `@BooleanField`, `@EnumField`, `@DateField`, `@UUIDField`, `@EmailField`, `@PhoneField`, `@PasswordField` (kèm các biến thể `*Optional`).
     - Tự động kích hoạt cơ chế `@Trim()` cho mọi dữ liệu dạng string đầu vào.
  2. **Controllers Refactoring (HTTP & Param Decorators)**:
     - Thay thế các cụm `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()` bằng `@Auth()`.
     - Thay thế `Param('id', ParseUUIDPipe)` bằng `@UUIDParam('id')`.
  3. **Preserve AutoMapper Metadata**:
     - Giữ nguyên toàn bộ `@AutoMap()` decorators trên các DTO fields để bảo đảm logic mapping không bị gián đoạn.
- **Explicit Out-of-Scope**:
  - Không sửa đổi logic nghiệp vụ trong các Services/Repositories.
  - Không thay đổi cấu trúc bảng / Entity ORM.
  - Không thay đổi contract API (tên field, kiểu trả về của endpoint giữ nguyên 100%).

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)
- **Core Mechanism**:
  - Refactor theo từng feature module độc lập nhằm kiểm soát chặt chẽ blast radius và dễ dàng verify thông qua test suite / compiler.
  - **DTO Pattern Transformation**:
    ```typescript
    // Trước:
    @ApiProperty()
    @IsString()
    @MaxLength(100)
    @AutoMap()
    firstName: string;

    // Sau:
    @StringField({ maxLength: 100 })
    @AutoMap()
    firstName: string;
    ```
  - **Controller Pattern Transformation**:
    ```typescript
    // Trước:
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    getUser(@Param('id', new ParseUUIDPipe()) id: string) {}

    // Sau:
    @Auth()
    @Get(':id')
    getUser(@UUIDParam('id') id: string) {}
    ```

- **Phân nhóm Modules Triển khai**:
  - **Nhóm 1 (Core Identity & Access)**: `auth`, `user`, `setting`.
  - **Nhóm 2 (Core Business & Data Ingestion)**: `data-provider`, `simulation`, `import-data`, `cloud-data`.
  - **Nhóm 3 (Background, Infrastructure & Integration)**: `schedule`, `google`, `notification`, `audit-log`, `websocket`, `queue`.

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)
- **AutoMapper Compatibility**: Cần bảo đảm `@AutoMap()` được đặt đồng thời với các Field decorators để AutoMapper scan metadata chính xác.
- **Optional vs Nullable Fields**: Các trường không bắt buộc cần sử dụng đúng biến thể `*Optional` (ví dụ `@StringFieldOptional()`) để Swagger hiển thị `required: false` và validation cho phép bỏ trống.
- **Query Params Casting**: Các query DTO dạng phân trang hoặc filter số/boolean cần dùng `@NumberFieldOptional({ int: true })` hoặc `@BooleanFieldOptional()` để tận dụng `class-transformer` chuyển đổi kiểu dữ liệu query string sang primitive types chuẩn.
