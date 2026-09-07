---
status: done
slug: custom-rest-api-decorators
started_at: 2026-09-07
completed_at: 2026-09-07
pr_url: ~
branch: ~
---

# Plan: Triển khai Custom REST API Decorators & Refactor Toàn bộ Controllers

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: Tất cả 28 Controller trong hệ thống đều đang khai báo thủ công danh sách dài các decorators (`@ApiOperation`, `@Version`, `@Get`/`@Post`/..., `@BaseApiOkResponse`, `@HttpCode`) kèm tiền tố `public async` trước mỗi handler method.
- **Điểm nghẽn kỹ thuật**: Gây loãng code, tốn dòng, lặp lại boilerplate và không thống nhất khi có thay đổi convention API toàn hệ thống.
- **Invariants bắt buộc giữ nguyên**:
  - Bảo toàn 100% logic nghiệp vụ, parameters (`@Body()`, `@Param()`, `@Query()`, `@UUIDParam()`, `@User()`, `@UploadedFile()`), guards (`@Auth()`), và return types của toàn bộ controller methods.
  - Đảm bảo Swagger OpenAPI metadata, route paths, HTTP verbs, status codes, và API versioning (`v1`) không bị thay đổi hành vi.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md)*

### Type Signatures & Code Contracts

```typescript
// src/decorators/rest-api.decorator.ts
export interface IRestApiOptions {
    path?: string | string[];
    summary?: string;
    description?: string;
    responseDto?: Type<unknown>;
    isArray?: boolean;
    version?: string | string[];
    httpCode?: HttpStatus;
    deprecated?: boolean;
}

export function GetRestApi(options?: IRestApiOptions): MethodDecorator;
export function PostRestApi(options?: IRestApiOptions): MethodDecorator;
export function PutRestApi(options?: IRestApiOptions): MethodDecorator;
export function DeleteRestApi(options?: IRestApiOptions): MethodDecorator;
export function PatchRestApi(options?: IRestApiOptions): MethodDecorator;
```

### AST Seams & Callers
- **Tạo mới**: `src/decorators/rest-api.decorator.ts` chứa logic gom nhóm qua `applyDecorators`.
- **Export**: `src/decorators/index.ts` xuất bản các hàm `@*RestApi()`.
- **Áp dụng toàn diện**: 28 Controller files trong `src/`:
  - Chuyển đổi toàn bộ `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` kết hợp `@ApiOperation`, `@Version`, `@BaseApiOkResponse`, `@HttpCode` sang `@GetRestApi`, `@PostRestApi`, `@PutRestApi`, `@DeleteRestApi`, `@PatchRestApi`.
  - Loại bỏ từ khóa `public` ở tất cả action methods (`async method(...)`).
  - Dọn dẹp các unused imports.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
src/
├── app.controller.ts                                             # [MODIFY]
├── common/base.controller.ts                                     # [MODIFY]
├── decorators/
│   ├── [NEW]    rest-api.decorator.ts                            # Factory & Method decorators
│   └── [MODIFY] index.ts                                         # Export rest-api.decorator
└── modules/
    ├── audit-log/controllers/audit-log.controller.ts             # [MODIFY]
    ├── auth/controllers/auth.controller.ts                       # [MODIFY]
    ├── cloud-data/controllers/
    │   ├── cloud-data-item.controller.ts                         # [MODIFY]
    │   └── cloud-data-provider.controller.ts                     # [MODIFY]
    ├── data-provider/controllers/
    │   ├── data-provider-feature.controller.ts                   # [MODIFY]
    │   ├── data-provider-item.controller.ts                      # [MODIFY]
    │   ├── data-provider.controller.ts                           # [MODIFY]
    │   ├── discovery-session.controller.ts                       # [MODIFY]
    │   ├── discovery-url.controller.ts                           # [MODIFY]
    │   ├── discovery-validation.controller.ts                    # [MODIFY]
    │   ├── item.controller.ts                                    # [MODIFY]
    │   └── scraping-data.controller.ts                           # [MODIFY]
    ├── google/controllers/
    │   ├── file-tag.controller.ts                                # [MODIFY]
    │   ├── google-auth.controller.ts                             # [MODIFY]
    │   ├── google-drive.controller.ts                            # [MODIFY]
    │   ├── google-file.controller.ts                             # [MODIFY]
    │   └── google-folder.controller.ts                           # [MODIFY]
    ├── import-data/controllers/import-data.controller.ts         # [MODIFY]
    ├── queue/controllers/queue.controller.ts                     # [MODIFY]
    ├── schedule/controllers/
    │   ├── schedule-job-event.controller.ts                      # [MODIFY]
    │   ├── schedule-job.controller.ts                            # [MODIFY]
    │   └── schedule.controller.ts                                # [MODIFY]
    ├── setting/controllers/setting.controller.ts                 # [MODIFY]
    ├── simulation/controllers/
    │   ├── simulation-context.controller.ts                      # [MODIFY]
    │   ├── simulation-item.controller.ts                         # [MODIFY]
    │   └── simulation.controller.ts                              # [MODIFY]
    └── user/controllers/user.controller.ts                       # [MODIFY]
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/decorators/rest-api.decorator.ts` | Decorator factory & @*RestApi exports | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/decorators/index.ts` | Export `rest-api.decorator` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |
| **3** | `[x]` | `[MODIFY]` | `src/app.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **4** | `[x]` | `[MODIFY]` | `src/common/base.controller.ts` | Refactor base endpoints | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/audit-log/controllers/audit-log.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **6** | `[x]` | `[MODIFY]` | `src/modules/auth/controllers/auth.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/cloud-data/controllers/cloud-data-item.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **8** | `[x]` | `[MODIFY]` | `src/modules/cloud-data/controllers/cloud-data-provider.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **9** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider-feature.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **10** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider-item.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **11** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/data-provider.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **12** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-session.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **13** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-url.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **14** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/discovery-validation.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **15** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/item.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **16** | `[x]` | `[MODIFY]` | `src/modules/data-provider/controllers/scraping-data.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **17** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/file-tag.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **18** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/google-auth.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **19** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/google-drive.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **20** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/google-file.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **21** | `[x]` | `[MODIFY]` | `src/modules/google/controllers/google-folder.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **22** | `[x]` | `[MODIFY]` | `src/modules/import-data/controllers/import-data.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **23** | `[x]` | `[MODIFY]` | `src/modules/queue/controllers/queue.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **24** | `[x]` | `[MODIFY]` | `src/modules/schedule/controllers/schedule-job-event.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **25** | `[x]` | `[MODIFY]` | `src/modules/schedule/controllers/schedule-job.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **26** | `[x]` | `[MODIFY]` | `src/modules/schedule/controllers/schedule.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **27** | `[x]` | `[MODIFY]` | `src/modules/setting/controllers/setting.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **28** | `[x]` | `[MODIFY]` | `src/modules/simulation/controllers/simulation-context.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **29** | `[x]` | `[MODIFY]` | `src/modules/simulation/controllers/simulation-item.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **30** | `[x]` | `[MODIFY]` | `src/modules/simulation/controllers/simulation.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |
| **31** | `[x]` | `[MODIFY]` | `src/modules/user/controllers/user.controller.ts` | Refactor endpoints & drop `public` | `Order 2` | `npx tsc -p tsconfig.build.json --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

*(Tất cả file đã được áp dụng và format qua Prettier theo đúng cấu trúc)*

---

## Section 5. Test Cases & Verification

- **Automated Verification**:
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` - **PASS** (Zero compiler / decorator metadata errors).
  - `[x]` `npx prettier --write ...` - **PASS** (Toàn bộ 28 controllers và decorators đã được format chuẩn).
- **Manual Verification**:
  - Swagger UI & API Routing phản ánh chính xác các endpoints rút gọn.
