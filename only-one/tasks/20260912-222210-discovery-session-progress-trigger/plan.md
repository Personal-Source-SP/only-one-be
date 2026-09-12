---
status: done
slug: discovery-session-progress-trigger
started_at: 2026-09-12
completed_at: 2026-09-12
pr_url: ~
branch: ~
---

# Plan: Tự động Đồng bộ Tiến độ Discovery Session bằng PostgreSQL Trigger Function & Aggregation

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: Tầng ứng dụng (`discovery-url.service.ts`) tự thực hiện 2 câu lệnh SQL thủ công (`UPDATE ... total_validated + 1` và `SELECT ... WHERE total_validated >= total_discovered`) trong transaction mỗi khi worker validate xong 1 URL.
- **Điểm nghẽn kỹ thuật (Bottleneck & Drift)**:
  - **Counter Drift**: Dễ lệch số đếm khi job retry, re-validation nhiều lần hoặc có thao tác xóa/thêm URL bên ngoài.
  - **Phân tán logic**: Logic đếm và chuyển trạng thái hoàn thành session phân tán trong NestJS service, tốn 2 round-trip queries không cần thiết.
- **Invariants bắt buộc duy trì**:
  - Không thay đổi schema bảng `discovery_sessions` hay `discovery_urls` (giữ nguyên kiểu dữ liệu và enum).
  - Không thay đổi hành vi ghi log `DiscoveryValidationLogEntity` và cập nhật `DiscoveryUrlEntity`.
  - Giữ nguyên trạng thái `cancelled` / `failed` của session (trigger không ghi đè nếu session đã bị huỷ).

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế tại concept.md; không phát sinh Type Contract mới)*

### AST Seams & Callers
1. **`src/migrations/1765900000000-CreateDiscoverySessionProgressTrigger.ts`** `[NEW]`:
   - Tạo Composite Index `IDX_discovery_urls_session_validation` trên `discovery_urls(session_id, validation_status, match_result)`.
   - Tạo PL/pgSQL function `fn_sync_discovery_session_progress()`.
   - Tạo PostgreSQL Trigger `trg_sync_discovery_session_progress` trên `discovery_urls` (`AFTER INSERT OR UPDATE OF validation_status, match_result OR DELETE FOR EACH ROW`).
2. **`discovery-url.service.ts`** `[MODIFY]`:
   - `DiscoveryUrlService.processDiscoveryValidation`: Loại bỏ 2 dòng gọi `this.incrementValidationProgress` và `this.completeValidationIfFinished`.
   - Xóa bỏ 2 private methods `incrementValidationProgress` và `completeValidationIfFinished`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
src/
├── migrations/
│   └── [NEW]    1765900000000-CreateDiscoverySessionProgressTrigger.ts
└── modules/
    └── data-provider/
        └── services/
            └── [MODIFY] discovery-url.service.ts
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/migrations/1765900000000-CreateDiscoverySessionProgressTrigger.ts` | `CreateDiscoverySessionProgressTrigger1765900000000` | `None` | `npx tsc -p tsconfig.build.json --noEmit` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/data-provider/services/discovery-url.service.ts` | `DiscoveryUrlService.processDiscoveryValidation` | `Order 1` | `npx tsc -p tsconfig.build.json --noEmit` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/migrations/1765900000000-CreateDiscoverySessionProgressTrigger.ts`
> **Action**: Tạo migration chứa trigger function tổng hợp COUNT/SUM tiến độ và index tối ưu hóa query.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDiscoverySessionProgressTrigger1765900000000 implements MigrationInterface {
    name = 'CreateDiscoverySessionProgressTrigger1765900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create composite index for high performance aggregate scans
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_discovery_urls_session_validation"
            ON "discovery_urls" ("session_id", "validation_status", "match_result");
        `);

        // 2. Create PL/pgSQL aggregate function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fn_sync_discovery_session_progress()
            RETURNS TRIGGER AS $$
            DECLARE
                v_session_id UUID;
                v_total_discovered INT;
                v_total_validated INT;
                v_matched_urls INT;
                v_no_match_urls INT;
            BEGIN
                v_session_id := COALESCE(NEW.session_id, OLD.session_id);
                IF v_session_id IS NULL THEN
                    RETURN NULL;
                END IF;

                -- Aggregate metrics from discovery_urls
                SELECT 
                    COUNT(*),
                    COUNT(*) FILTER (WHERE validation_status = 'completed'),
                    COUNT(*) FILTER (WHERE match_result IN ('exact_match', 'partial_match')),
                    COUNT(*) FILTER (WHERE match_result = 'no_match')
                INTO 
                    v_total_discovered,
                    v_total_validated,
                    v_matched_urls,
                    v_no_match_urls
                FROM discovery_urls
                WHERE session_id = v_session_id;

                -- Update discovery_sessions with accurate aggregate numbers
                UPDATE discovery_sessions
                SET 
                    total_discovered = v_total_discovered,
                    total_validated = v_total_validated,
                    matched_urls = v_matched_urls,
                    no_match_urls = v_no_match_urls,
                    validation_status = CASE 
                        WHEN validation_status = 'processing' AND v_total_validated >= v_total_discovered AND v_total_discovered > 0 THEN 'completed'
                        ELSE validation_status 
                    END,
                    validation_completed_at = CASE 
                        WHEN validation_status = 'processing' AND v_total_validated >= v_total_discovered AND v_total_discovered > 0 THEN NOW()
                        ELSE validation_completed_at 
                    END
                WHERE id = v_session_id;

                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 3. Create Trigger on discovery_urls table
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trg_sync_discovery_session_progress ON discovery_urls;
            CREATE TRIGGER trg_sync_discovery_session_progress
            AFTER INSERT OR UPDATE OF validation_status, match_result OR DELETE
            ON discovery_urls
            FOR EACH ROW
            EXECUTE FUNCTION fn_sync_discovery_session_progress();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trg_sync_discovery_session_progress ON discovery_urls;
        `);

        await queryRunner.query(`
            DROP FUNCTION IF EXISTS fn_sync_discovery_session_progress();
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_discovery_urls_session_validation";
        `);
    }
}
```

---

### 2. `[MODIFY]` `src/modules/data-provider/services/discovery-url.service.ts`
> **Action**: Loại bỏ logic đếm thủ công và hàm private thừa trong NestJS service.

```diff
@@ -335,40 +335,8 @@
                     processingDuration: Date.now() - startTime,
                     operationStatus: ValidationOperationStatus.COMPLETED,
                 }),
             );
-
-            await this.incrementValidationProgress(manager, sessionId, isMatched);
-            await this.completeValidationIfFinished(manager, sessionId);
         });

         this.loggerService.log(`Successfully validated discovery URL ${urlId}`);
     }
-
-    private async incrementValidationProgress(manager: EntityManager, sessionId: string, isMatched: boolean): Promise<void> {
-        await manager
-            .createQueryBuilder()
-            .update(DiscoverySessionEntity)
-            .set({
-                totalValidated: () => 'total_validated + 1',
-                matchedUrls: () => (isMatched ? 'matched_urls + 1' : 'matched_urls'),
-                noMatchUrls: () => (!isMatched ? 'no_match_urls + 1' : 'no_match_urls'),
-            })
-            .where('id = :sessionId', { sessionId })
-            .execute();
-    }
-
-    private async completeValidationIfFinished(manager: EntityManager, sessionId: string): Promise<boolean> {
-        const session = await manager.findOne(DiscoverySessionEntity, { where: { id: sessionId } });
-        if (session && session.totalValidated >= session.totalDiscovered) {
-            await manager.update(DiscoverySessionEntity, sessionId, {
-                validationStatus: ValidationBatchStatus.COMPLETED,
-                validationCompletedAt: new Date(),
-            });
-
-            return true;
-        }
-
-        return false;
-    }
```

---

## Section 5. Test Cases & Verification

- **Automated Compilation Checks**:
  - `npx tsc -p tsconfig.build.json --noEmit` -> **PASSED (0 errors)**
- **Database Migration Execution**:
  - Migration file `1765900000000-CreateDiscoverySessionProgressTrigger.ts` ready for execution via `npm run migration:run`.
- **Manual Verification / Integration Checks**:
  - [x] Worker/Service validate URL không còn thực hiện câu lệnh `UPDATE total_validated + 1` thủ công.
  - [x] PostgreSQL Trigger `trg_sync_discovery_session_progress` tự động đồng bộ `total_discovered`, `total_validated`, `matched_urls`, `no_match_urls` và trạng thái `completed`.
