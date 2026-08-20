# Controller Architecture

## Trách nhiệm & Vị trí

Controller đóng vai trò HTTP adapter: bind request, kiểm tra Auth/Permission, gọi Service và trả về Response DTO chuẩn.

- **Vị trí**: `src/modules/<feature>/controllers/<feature>.controller.ts`

## Code mẫu

```ts
@Controller('features')
@ApiTags('features')
export class FeatureController extends BaseController {
  constructor(private readonly featureService: FeatureService) {
    super();
  }

  @Get(':id')
  @Permissions(PermissionGroups.FEATURE, PermissionActions.READ)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponseDto({ type: FeatureDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Feature was not found.' })
  async getOne(@UUIDParam('id') id: string): Promise<ResponseDto<FeatureDto>> {
    const result = await this.featureService.getOne(id);
    return this.getResponse(true, result);
  }
}
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Kế thừa & Binding**: Controller phải kế thừa `BaseController`. Dùng `@Body()` / `@Query()` gắn với Request DTO và `@UUIDParam()` cho tham số UUID.
- ✅ **Bảo mật & Phân quyền**: Luôn gắn decorator `@Auth()` và `@Permissions()` theo từng hành động cụ thể.
- ✅ **Swagger Documentation**:
  - Khai báo đầy đủ Swagger operation, success response schema (`@ApiResponseDto`).
  - Khai báo các error response thực sự có thể xảy ra (`400` validation, `401` unauthorized, `403` forbidden, `404` not found, `409` conflict).
- ✅ **Xử lý kết quả**: Gọi Service lưu vào biến `const result = await this.featureService...`, sau đó gọi `const response = this.getResponse(true, result); return response;`.
- ❌ **Không phụ thuộc DB/Business**: Không inject Repository/`EntityManager`, không query DB, không map entity hoặc mở transaction trực tiếp trong Controller.
- ❌ **Không return trực tiếp hàm/await**: BẮT BUỘC lưu kết quả xử lý vào biến trước khi `return`. Không lồng `return await ...` hoặc `return getResponse(await ...)` trực tiếp làm khó quá trình debug/breakpoint.
- ❌ **Không trả entity thô**: Chỉ trả về `ResponseDto<TDto>` theo chuẩn của hệ thống.
