# Test Architecture

## Trách nhiệm & Vị trí

Unit test tập trung bảo vệ **Business Logic**, quy tắc nghiệp vụ domain, security behavior và phòng ngừa lỗi đứt gãy (regression). Test chạy nhanh, độc lập và cô lập với DB/Network.

- **Vị trí**: `src/modules/<feature>/<layer>/_tests/<source>.spec.ts`

## Code mẫu

```ts
describe('FeatureService', () => {
  it('should calculate final price with active discount rules', async () => {
    const result = await service.calculateOrderPrice({ packageId: 'pkg-1', voucherCode: 'SUMMER' });
    expect(result.finalPrice).toEqual(80000);
  });

  it('should throw ConflictException when entity status is not INACTIVE during activation', async () => {
    mockRepository.findById.mockResolvedValueOnce({ status: FeatureStatus.ACTIVE });
    await expect(service.activate('id')).rejects.toThrow(ConflictException);
  });
});
```

## Quy chuẩn thực thi (Guidelines & Rules)

- ✅ **Tập trung vào Business Logic & Domain Invariants**:
  - Viết test cho các luồng nghiệp vụ cốt lõi: tính toán logic, kiểm tra điều kiện chuyển trạng thái (state transition), kiểm tra ràng buộc quyền hạn, và xử lý ranh giới dữ liệu (`undefined`, `null`, mảng rỗng).
  - Kiểm tra kết quả trả về (output value) và thay đổi trạng thái hệ thống mong muốn thay vì kiểm tra câu chữ hay cú pháp implementation.
- ✅ **Vị trí & Đặt tên**: Luôn đặt file test trong thư mục `_tests/` nằm cùng cấp với file code cần test (ví dụ: `services/_tests/feature.service.spec.ts`).
- ✅ **Mocking & Isolation**:
  - Mock đúng thứ tự DI constructor và dependencies (Repository, External Service, Transaction).
  - Không kết nối DB thật hoặc Network thật trong Unit Test.
- ❌ **Tránh Syntax & Trivial Tests**:
  - **Không** viết test chỉ để kiểm tra cú pháp ngôn ngữ hay boilerplate code (như test getter/setter đơn thuần, test constructor của DTO, test việc gọi method mà không assert kết quả nghiệp vụ).
  - **Không** lạm dụng assertion soi quá sâu vào private implementation detail, tránh việc test bị đứt gãy khi refactor code dù logic nghiệp vụ không đổi.
