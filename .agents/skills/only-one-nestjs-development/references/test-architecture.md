# Test Architecture

## Responsibilities & Location

Unit tests protect **Business Logic**, domain rules, authorization behaviors, and safeguard against regressions. Tests must execute fast, deterministically, and isolated from live databases or network I/O.

- **Location**: `src/modules/<feature>/<layer>/_tests/<source>.spec.ts`

## Code Example

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

## Guidelines & Rules

- ✅ **Focus on Domain Invariants & Business Logic**:
  - Test critical business paths: complex calculations, state transition validations, authorization checks, and boundary handling (`undefined`, `null`, empty arrays).
  - Assert observable outputs and intended state mutations rather than internal variable naming or implementation mechanics.
- ✅ **Location & Naming Conventions**: Place test files inside a `_tests/` folder adjacent to the target component (e.g., `services/_tests/feature.service.spec.ts`, `helpers/_tests/format.helper.spec.ts`).
- ✅ **Mocking & Isolation**:
  - Mock dependencies (Repositories, External Services, Logger, EntityManager transactions) via Dependency Injection test modules.
  - Never establish real database connections or perform external network calls inside unit tests.
- ❌ **Avoid Boilerplate & Trivial Tests**:
  - Do not write tests that merely verify language syntax or boilerplate (e.g., testing pure getters/setters, DTO constructors, or method invocation without asserting business outcomes).
  - Do not couple assertions to private implementation details; tests should survive internal refactorings as long as public domain behavior remains invariant.
