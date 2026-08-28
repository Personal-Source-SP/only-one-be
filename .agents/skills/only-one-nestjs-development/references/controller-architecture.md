# Controller Architecture

## Responsibilities & Location

Controllers act as HTTP transport adapters: binding requests, checking authentication and permissions, invoking domain services, and returning standardized response DTOs.

- **Location**: `src/modules/<feature>/controllers/<feature>.controller.ts`

## Code Example

```ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { BaseController } from '@/common/base.controller';
import { Auth, Permissions, UUIDParam } from '@/common/decorators';
import { PermissionActions, PermissionGroups } from '@/common/constants';
import { ResponseDto } from '@/common/dto/response.dto';
import { ApiResponseDto } from '@/common/decorators/api-response-dto.decorator';
import { FeatureService } from '../services';
import { CreateFeatureRequest } from '../dtos/requests';
import { FeatureDto } from '../dtos/responses';

@Controller('features')
@ApiTags('features')
@ApiBearerAuth()
@Auth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
export class FeatureController extends BaseController {
  constructor(private readonly featureService: FeatureService) {
    super();
  }

  @Post()
  @Permissions(PermissionGroups.FEATURE, PermissionActions.CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiResponseDto({ type: FeatureDto })
  async create(
    @Body() request: CreateFeatureRequest,
  ): Promise<ResponseDto<FeatureDto>> {
    const result = await this.featureService.create(request);
    return this.getResponse(true, result);
  }

  @Get(':id')
  @Permissions(PermissionGroups.FEATURE, PermissionActions.READ)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponseDto({ type: FeatureDto })
  @ApiNotFoundResponse({ description: 'Feature was not found.' })
  async getOne(@UUIDParam('id') id: string): Promise<ResponseDto<FeatureDto>> {
    const result = await this.featureService.getOne(id);
    return this.getResponse(true, result);
  }

  @Get('public/active')
  @Auth({ options: { public: true } })
  @ApiResponseDto({ type: FeatureDto, isArray: true })
  async getPublicActive(): Promise<ResponseDto<FeatureDto[]>> {
    const result = await this.featureService.getPublicActive();
    return this.getResponse(true, result);
  }
}
```

## Guidelines & Rules

- ✅ **Inheritance & Binding**: Controllers must extend `BaseController`. Bind parameters with `@Body()` / `@Query()` typed to request DTOs and use `@UUIDParam()` for UUID route parameters.
- ✅ **Security & Authorization (`@Auth` & `@Permissions`)**:
  - **Class-Level `@Auth()`**: Apply `@Auth()` at the controller class level so all feature endpoints are secured by default with JWT authentication and documented via `@ApiBearerAuth()`.
  - **Route-Level `@Permissions(group, action)`**: Enforce granular RBAC permission checks on individual routes matching specific domain actions (e.g., `PermissionGroups.FEATURE, PermissionActions.CREATE` / `READ` / `UPDATE` / `DELETE`).
  - **Public Route Override**: When the controller class is guarded by `@Auth()`, override specific public endpoints using `@Auth({ options: { public: true } })`.
- ✅ **Swagger Documentation**:
  - Declare OpenAPI operations and response schemas (`@ApiResponseDto`).
  - Document expected error status codes (`400` validation, `401` unauthorized, `403` forbidden, `404` not found, `409` conflict).
- ✅ **Result Processing**: Invoke services and capture async results into descriptive variables before formatting the response (`const result = await this.featureService...; return this.getResponse(true, result);`).
- ❌ **No Direct Database/Business Logic**: Never inject `EntityManager` / Repositories, execute raw queries, map entities, or manage transactions directly within controllers.
- ❌ **No Inline Await Calls**: Avoid inlining `await` directly inside `this.getResponse(true, await ...)` or returning raw promises; always capture the async service result into a local variable (`const result = await ...`) first to streamline breakpoint debugging.
- ❌ **No Raw Entity Leaks**: Never return raw ORM entities directly across HTTP boundaries. Always return standardized `ResponseDto<TDto>`.
