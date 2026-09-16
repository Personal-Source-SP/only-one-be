---
status: done
slug: toggle-file-logging
started_at: 2026-09-16
completed_at: 2026-09-16
pr_url: ~
branch: ~
---

# Plan: Cơ chế Bật / Tắt Ghi File Logs (Toggle File Logging)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- `LoggerService` ([logger.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/shared/services/logger.service.ts)) hiện tại luôn tự động khởi tạo 2 instance của `DailyRotateFile` (cho level `debug` và `warn`) ghi ra thư mục `./logs/${nodeEnv}/${contextName}`, không kiểm tra cờ bật/tắt file logging.
- `AppConfigService` ([app-config.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/shared/services/app-config.service.ts)) quản lý các biến môi trường của hệ thống nhưng chưa có getter và mapping cho cờ `LOG_FILE_ENABLE`.
- File môi trường mẫu ([.env.sample](file:///Users/kiem/Sources/PERSONAL/only-one-be/.env.sample)) chưa định nghĩa biến `LOG_FILE_ENABLE`.
- **Invariants bắt buộc duy trì**:
  - `winston.transports.Console` luôn luôn được nạp và hoạt động bình thường độc lập với cờ file log.
  - Cấu trúc thư mục log và định dạng rotation (`YYYY-MM-DD`, `maxSize: '20m'`, `maxFiles: '14d'`) giữ nguyên khi `LOG_FILE_ENABLE=true`.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md; không phát sinh Type Contract mới)*

- **Code Contracts**:
  - `AppConfigService.isFileLoggingEnabled`: `get isFileLoggingEnabled(): boolean` đọc từ `this.getBoolean('LOG_FILE_ENABLE') || false`.
  - `LoggerService.getWinstonConfig(contextName: string)`: nạp `DailyRotateFile` transports khi `process.env.LOG_FILE_ENABLE === 'true'`.
- **AST Seams & Callers**:
  - `src/shared/services/logger.service.ts`: `LoggerService.getWinstonConfig` (line 88-119).
  - `src/shared/services/app-config.service.ts`: thêm getter `isFileLoggingEnabled` vào class `AppConfigService`.
  - `.env.sample` và `.env`: bổ sung khai báo `LOG_FILE_ENABLE`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
only-one-be/
├── [MODIFY] .env.sample                                  # Khai báo biến cấu hình LOG_FILE_ENABLE
├── [MODIFY] .env                                         # Cấu hình giá trị mặc định LOG_FILE_ENABLE
└── src/shared/services/
    ├── [MODIFY] app-config.service.ts                    # Thêm getter isFileLoggingEnabled
    ├── [MODIFY] logger.service.ts                        # Conditionally nạp DailyRotateFile transports
    └── _tests/
        └── [NEW]    logger.service.spec.ts               # Unit test kiểm tra logic toggle file logging
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `.env.sample` | Environment template | `None` | `npm run lint` |
| **2** | `[x]` | `[MODIFY]` | `src/shared/services/app-config.service.ts` | `AppConfigService.isFileLoggingEnabled` | `None` | `npm run lint` |
| **3** | `[x]` | `[MODIFY]` | `src/shared/services/logger.service.ts` | `LoggerService.getWinstonConfig` | `None` | `npm run lint` |
| **4** | `[x]` | `[NEW]` | `src/shared/services/_tests/logger.service.spec.ts` | `LoggerService` unit tests | `Order 3` | `node -r ts-node/register -r tsconfig-paths/register --test src/shared/services/_tests/logger.service.spec.ts` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `.env.sample`
> **Action**: Bổ sung khai báo biến môi trường mẫu `LOG_FILE_ENABLE`.

```diff
@@ -10,6 +10,9 @@
 JWT_EXPIRE=$JWT_EXPIRE
 JWT_REFRESH_EXPIRE=$JWT_REFRESH_EXPIRE
 
+# Logging config
+LOG_FILE_ENABLE=$LOG_FILE_ENABLE
+
 CRON=$CRON
 AUTO_MIGRATION=$AUTO_MIGRATION
```

---

### 2. `[MODIFY]` `src/shared/services/app-config.service.ts`
> **Action**: Thêm getter `isFileLoggingEnabled` để truy xuất cờ bật/tắt file logging từ `AppConfigService`.

```diff
@@ -53,6 +53,10 @@
         return this.getBoolean('AUTO_MIGRATION') || false;
     }
 
+    get isFileLoggingEnabled(): boolean {
+        return this.getBoolean('LOG_FILE_ENABLE') || false;
+    }
+
     get swaggerConfig(): ISwaggerConfigInterface {
         return {
             path: this.get('SWAGGER_PATH') || '',
```

---

### 3. `[MODIFY]` `src/shared/services/logger.service.ts`
> **Action**: Khởi tạo mảng `transports` với `Console` transport mặc định và chỉ nạp `DailyRotateFile` khi `process.env.LOG_FILE_ENABLE === 'true'`.

```diff
@@ -88,11 +88,17 @@
     private getWinstonConfig(contextName: string): winston.LoggerOptions {
         const nodeEnv = process.env.NODE_ENV || 'development';
         const basePath = `./logs/${nodeEnv}/${contextName}`;
+        const isFileLoggingEnabled = process.env.LOG_FILE_ENABLE === 'true';
 
-        return {
-            exitOnError: false,
-            transports: [
+        const transports: winston.transport[] = [
+            new winston.transports.Console({
+                level: 'debug',
+                format: this.getCustomConsoleFormat(contextName),
+            }),
+        ];
+
+        if (isFileLoggingEnabled) {
+            transports.push(
                 new DailyRotateFile({
                     level: 'debug',
                     filename: `${basePath}/debug-%DATE%.log`,
@@ -109,12 +115,13 @@
                     maxFiles: '14d',
                     format: winston.format.combine(this.getLevelFilter('warn'), winston.format.timestamp(), winston.format.json()),
                 }),
-                new winston.transports.Console({
-                    level: 'debug',
-                    format: this.getCustomConsoleFormat(contextName),
-                }),
-            ],
+            );
+        }
+
+        return {
+            exitOnError: false,
+            transports,
         };
     }
 }
```

---

### 4. `[NEW]` `src/shared/services/_tests/logger.service.spec.ts`
> **Action**: Viết unit test xác thực logic nạp transports khi cờ `LOG_FILE_ENABLE` bật và tắt.

```typescript
import DailyRotateFile from 'winston-daily-rotate-file';
import * as winston from 'winston';

import { LoggerService } from '../logger.service';

describe('LoggerService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should only include Console transport when LOG_FILE_ENABLE is not true', () => {
        process.env.LOG_FILE_ENABLE = 'false';
        const service = new LoggerService('TestContext');
        const logger = (service as any).logger as winston.Logger;

        expect(logger.transports).toHaveLength(1);
        expect(logger.transports[0]).toBeInstanceOf(winston.transports.Console);
    });

    it('should include DailyRotateFile transports when LOG_FILE_ENABLE is true', () => {
        process.env.LOG_FILE_ENABLE = 'true';
        const service = new LoggerService('TestContext');
        const logger = (service as any).logger as winston.Logger;

        expect(logger.transports).toHaveLength(3);
        const rotateTransports = logger.transports.filter((t) => t instanceof DailyRotateFile);
        expect(rotateTransports).toHaveLength(2);
    });
});
```

---

## Section 5. Test Cases & Verification
- **Automated Tests**:
  - [x] Unit test kiểm tra LoggerService (`node -r ts-node/register -r tsconfig-paths/register --test src/shared/services/_tests/logger.service.spec.ts`):
    - **Evidence**: `PASS` (2/2 tests passed, 0 failures, 1 suite).
  - [x] ESLint check (`ESLINT_USE_FLAT_CONFIG=false npx eslint ...`):
    - **Evidence**: `0 errors, 0 warnings`.
  - [x] TypeScript build check (`npx tsc -p tsconfig.build.json`):
    - **Evidence**: `Exit code 0` (Clean build).
- **Manual Checks**:
  - Khi `LOG_FILE_ENABLE=false`: Logger chỉ đăng ký Console transport, không tạo bất kỳ file nào trong `logs/`.
  - Khi `LOG_FILE_ENABLE=true`: Logger đăng ký 2 transport `DailyRotateFile` (`debug` và `warn`) cùng với `Console` transport.
