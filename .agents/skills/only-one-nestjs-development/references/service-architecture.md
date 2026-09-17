# Service Architecture

## Responsibilities & Location

Services encapsulate use cases, business domain rules, persistence orchestration, error translation, and diagnostic logging.

- **Location**: `src/modules/<feature>/services/<feature>.service.ts`

## Code Example

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { InjectMapper } from '@automapper/nestjs';
import { Mapper } from '@automapper/core';
import { BaseService } from '@/common/base.service';
import { LoggerService } from '@/common/logger/logger.service';
import { AppError } from '@/common/constants/app-error';
import { FeatureEntity } from '../entities';
import { FeatureDto } from '../dtos';

@Injectable()
export class FeatureService extends BaseService<FeatureEntity> {
  constructor(
    private readonly _em: EntityManager,
    private readonly _logger: LoggerService,
    @InjectMapper() private readonly _mapper: Mapper,
    @InjectRepository(FeatureEntity)
    private readonly _featureRepository: EntityRepository<FeatureEntity>,
  ) {
    super(_featureRepository, _em, _logger, 'FeatureService');
  }

  async getOne(id: string): Promise<FeatureDto> {
    const result = await this.findById({ id, map: (item) => this.mapDto(item) });
    if (!result) {
      throw new NotFoundException(AppError.FeatureNotFound);
    }
    return result;
  }

  private mapDto(entity: FeatureEntity): FeatureDto {
    const mapped = this._mapper.map(entity, FeatureEntity, FeatureDto);
    return mapped;
  }

  private mapDtoArray(entities: FeatureEntity[]): FeatureDto[] {
    const mappedArray = this._mapper.mapArray(entities, FeatureEntity, FeatureDto);
    return mappedArray;
  }
}
```

## Guidelines & Rules

- ✅ **Structure & Inheritance**: Extend `BaseService` for standard persistence capabilities. Order methods: public synchronous -> public asynchronous -> private synchronous -> private asynchronous.
- ✅ **Debug-Friendly Return-by-Variable Convention**:
  - ALWAYS assign processing or `await` results to an explicit, descriptive variable before returning (`const result = await this.findById(...); return result;`).
  - ❌ **NEVER** return `await ...` directly or inline function calls on the return line without assignment.
  - *Rationale*: Intermediate variable bindings streamline debugger breakpoints, inspection of resolved return values, and downstream logging instrumentation.
- ✅ **Proactive Refactoring & DRY**:
  - When authoring or modifying code, extract repeated logic patterns into **`private` helper methods** within the Service to boost readability, maintainability, and reusability.
- ✅ **Default CRUD Operations**: Leverage `BaseService` built-in methods (`findById`, `createEntity`, `updatePartial`, `deleteEntity`, `findAll`, `findOneByFilter`, `exists`, `count`, `paginate`). Avoid ad-hoc `_em.findOne`/`_em.create`/`_em.flush` calls unless executing custom low-level workflows.
- ✅ **Mapping Patterns**: Keep `mapDto` and `mapDtoArray` as isolated private helper methods utilizing AutoMapper.
- ✅ **PATCH/Update Field Sanitization**: Use `pickDefined` to differentiate between omitted properties (`undefined`), explicit clearing (`null`), or empty arrays (`[]`).
- ✅ **Error Handling & i18n**:
  - All thrown exception keys must be declared in standard `AppError` constants with corresponding i18n translations.
  - Never throw hardcoded string messages bypassing `AppError`.
  - Perform not-found, conflict, and foreign-key relation guard checks prior to executing destructive writes.
- ✅ **Parameters & Type Contracts**:
  - Complex object parameters containing **3 or more properties** MUST be modeled as dedicated interfaces inside the `types/` folder, avoiding inline object types or ambiguous `Record<string, unknown>`.
  - ❌ **NEVER** declare `interface` or `type` definitions directly inside the `.service.ts` file.
  - ❌ **NEVER** return anonymous inline object types (e.g., `Promise<{ order: OrderEntity; payment: PaymentTransactionEntity } | null>`) from any method (`public`, `protected`, `private`, or internal helper).
  - ALL method return types, complex parameters, and intermediate structures MUST be explicitly modeled as Named Types / Interfaces inside `src/modules/<feature>/types/` and exported via `types/index.ts`.

  ```typescript
  // ❌ ANTI-PATTERN (DON'T): Anonymous inline return shape or declaring type in service file
  // File: src/modules/order/services/guest-order.service.ts

  // ❌ NEVER declare types inside service files!
  type OpenCheckoutResult = { order: OrderEntity; payment: PaymentTransactionEntity };

  @Injectable()
  export class GuestOrderService extends BaseService<OrderEntity> {
    // ❌ NEVER use anonymous inline object return shapes!
    private async _findOwnOpenCheckout(deviceId: string): Promise<{
      order: OrderEntity;
      payment: PaymentTransactionEntity;
    } | null> {
      // ...
    }
  }
  ```

  ```typescript
  // ✅ STANDARD MULTI-FILE ARCHITECTURE PATTERN (DO):

  // 1. File: src/modules/order/types/checkout-result.type.ts
  import type { OrderEntity } from "../entities/order.entity";
  import type { PaymentTransactionEntity } from "../entities/payment-transaction.entity";

  export type OpenCheckoutResult = {
    order: OrderEntity;
    payment: PaymentTransactionEntity;
  };

  // 2. File: src/modules/order/types/index.ts
  export * from "./checkout-result.type";

  // 3. File: src/modules/order/services/guest-order.service.ts
  import { Injectable } from "@nestjs/common";
  import { BaseService } from "@/common/base.service";
  import { OrderEntity } from "../entities";
  import type { OpenCheckoutResult } from "../types";

  @Injectable()
  export class GuestOrderService extends BaseService<OrderEntity> {
    private async _findOwnOpenCheckout(deviceId: string): Promise<OpenCheckoutResult | null> {
      const result = await this._orderRepository.findOne({ deviceId, status: OrderStatus.OPEN });
      if (!result) {
        return null;
      }
      return { order: result, payment: result.paymentTransaction };
    }
  }
  ```

- ✅ **Utility Libraries (Lodash & Dayjs)**:
  - For date operations, use **`dayjs`** instead of native `Date` comparison operators (`<`, `>`, `>=`). Use `dayjs.isBefore`, `dayjs.isAfter`, `dayjs.isSame`.
  - **Timezone Accuracy**: When handling timezone-dependent dates (schedules, reporting intervals, countdowns), ensure dayjs timezone plugins (`dayjs.extend(utc)`, `dayjs.extend(timezone)`) are active.
  - Prioritize **`lodash`** functions (`isEmpty`, `get`, `set`, `uniq`, `groupBy`, `keyBy`, `cloneDeep`, `omit`, `pick`) for array/object manipulations.
  - Use `switch/case` over enum or union discriminator types to ensure exhaustive compiler checks.
- ✅ **Transactions & Diagnostic Logging**:
  - Multi-write operations requiring atomic guarantees must run within database transactions.
  - Log via standard system logger formatted as `[ServiceName] message`. Never log credentials, secrets, passwords, or full raw payloads.
- ❌ **No HTTP Transport Leaks**: Never use HTTP decorators (`@Body`, `@Query`), Swagger annotations, or wrap responses in `ResponseDto` inside service layers.
- ❌ **Do Not Swallow Exceptions**: Avoid indiscriminate, blanket `try/catch` blocks. Only catch exceptions when translating, recovering, or attaching targeted diagnostic context.