# Concept: Chuẩn hóa thứ tự Handler trong DataProvider Controllers (GET -> POST -> PUT -> DELETE)

## 1. Problem & Goal (Vấn đề & Mục tiêu)
- **Problem**: Các controller trong module `data-provider` (`data-provider-feature`, `discovery-session`, `discovery-url`, `discovery-validation`,...) hiện đang có thứ tự các HTTP endpoint method xáo trộn (GET xen kẽ POST, PUT trước GET, POST sau PUT). Điều này làm giảm tính nhất quán (consistency), khó tra cứu code và tiềm ẩn nguy cơ xung đột route (route shadowing/precedence trong routing engine).
- **Goal**: Tái cấu trúc và sắp xếp lại toàn bộ các method route handler trong tất cả các controller thuộc thư mục `src/modules/data-provider/controllers` theo chuẩn quy ước chặt chẽ: `GET -> POST -> PUT -> DELETE`, đồng thời ưu tiên các static/specific routes đứng trước parameterized/wildcard routes (`:id`).

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - Toàn bộ 8 controller files trong `src/modules/data-provider/controllers/`:
    1. `data-provider-feature.controller.ts`
    2. `discovery-session.controller.ts`
    3. `discovery-url.controller.ts`
    4. `discovery-validation.controller.ts`
    5. `data-provider-item.controller.ts`
    6. `data-provider.controller.ts`
    7. `item.controller.ts`
    8. `scraping-data.controller.ts`
  - Sắp xếp các decorators, method definitions và Swagger annotations theo đúng thứ tự method nhóm `GET -> POST -> PUT/PATCH -> DELETE`.
  - Giữ nguyên 100% logic bên trong handler, annotations, types và decorators.
- **Explicit Out-of-Scope**:
  - Không thay đổi signature, URL path, DTO hoặc response type của bất kỳ API nào.
  - Không sửa đổi logic trong các Service, Entity hoặc Module liên quan.
  - Không tác động vào các controller thuộc modules khác ngoài `data-provider`.

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### Core Ordering Rules
Mỗi Controller tuân thủ cấu trúc phân tầng như sau:
1. **Class Decorators & Constructor**: `@Controller()`, `@ApiTags()`, `@Auth()`, constructor injection.
2. **GET Handlers Group**:
   - Static / Collection routes (e.g. `data-providers/:dataProviderId`, `sessions/:sessionId/...`)
   - Specific sub-routes (e.g. `:id/versions`, `:id/summary`, `:id/validation-logs`)
   - General detail / wildcard route (e.g. `:id`)
3. **POST Handlers Group**:
   - Static action / batch routes (e.g. `test`, `bulk-user-actions`, `process-scrape-data`)
   - Resource creation routes (e.g. root `@Post()`, `data-providers/:dataProviderId`)
   - Specific action routes (e.g. `:id/test`, `sessions/:sessionId/batch-ingest`, `:id/versions/:versionId/rollback`)
4. **PUT / PATCH Handlers Group**:
   - Specific state transition / sub-resource updates (e.g. `:id/switch-status/:status`, `:id/switch-status/:activeStatus`)
   - General resource update (e.g. `:id`)
5. **DELETE Handlers Group**:
   - Sub-resource deletions (e.g. `:id/versions/:versionId`)
   - Root / general deletion (nếu có)

### Chi tiết kế hoạch sắp xếp từng Controller

#### 1. `data-provider-feature.controller.ts`
- **GET**:
  1. `@Get('data-providers/:dataProviderId')` (`findAllByProviderId`)
  2. `@Get('data-providers/:dataProviderId/type/:type')` (`getFeatureByProviderIdAndType`)
  3. `@Get(':id/versions')` (`getVersions`)
  4. `@Get(':id')` (`findById`)
- **POST**:
  1. `@Post('test')` (`testStateless`)
  2. `@Post('data-providers/:dataProviderId')` (`createFeature`)
  3. `@Post(':id/test')` (`testContextual`)
  4. `@Post(':id/versions/:versionId/rollback')` (`rollbackVersion`)
- **PUT**:
  1. `@Put(':id/switch-status/:status')` (`switchStatus`)
  2. `@Put(':id')` (`updateConfig`)
- **DELETE**:
  1. `@Delete(':id/versions/:versionId')` (`deleteVersion`)

#### 2. `discovery-session.controller.ts`
- **GET**: `@Get(':id/summary')` (`getSummary`)
- **POST**: `@Post()` (`create`)

#### 3. `discovery-url.controller.ts`
- **GET**: `@Get(':id/validation-logs')` (`getValidationLogs`)
- **POST**: `@Post('sessions/:sessionId/batch-ingest')` (`batchIngestUrls`)

#### 4. `discovery-validation.controller.ts`
- **GET**:
  1. `@Get('sessions/:sessionId/latest-batch')` (`getLatestBatch`)
- **POST**:
  1. `@Post('sessions/:sessionId/validate')` (`triggerValidation`)
  2. `@Post('bulk-user-actions')` (`submitBulkUserActions`)
  3. `@Post('urls/:id/user-action')` (`submitUserAction`)
  4. `@Post('urls/:id/re-validate')` (`revalidate`)

#### 5. `data-provider-item.controller.ts`, `data-provider.controller.ts`, `item.controller.ts`, `scraping-data.controller.ts`
- Rà soát lại và đảm bảo tuyệt đối tuân thủ GET -> POST -> PUT -> DELETE.

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)
- **Route Precedence / Shadowing**: Trong NestJS/Express, nếu route `:id` đứng trước `:id/versions` hoặc các route cụ thể khác có thể gây nhầm lẫn param matching. Quy tắc đặt specific/sub-resource routes trước `:id` đảm bảo an toàn tuyệt đối.
- **Swagger Documentation Ordering**: Thứ tự hiển thị trên Swagger UI sẽ được sắp xếp lại trực quan, dễ theo dõi theo nhóm method.
