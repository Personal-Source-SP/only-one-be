---
status: planned
slug: distributed-network-scan-state
started_at: 2026-09-15
completed_at: ~
pr_url: ~
branch: ~
---

# Plan: Phân tán Trạng thái Quét Thiết bị Mạng với Redis (Distributed Network Scan State)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại & Điểm nghẽn**: `DeviceAggregatorService` quản lý 4 biến trạng thái in-memory (`discoveredCount`, `startedAt`, `completedAt`, `scanStatus`). Khi triển khai trên môi trường multi-node (sau Load Balancer), client kích hoạt quét ở Node 1 nhưng polling trạng thái ở Node 2 sẽ nhận được kết quả `IDLE` / `0 devices`. Ngoài ra, 2 request trigger đồng thời đến 2 node khác nhau sẽ gây ra race condition, kích hoạt 2 tiến trình quét song song làm quá tải mạng LAN.
- **Invariants bắt buộc giữ nguyên**:
  - Giữ nguyên API contract của các endpoint REST: `POST /network-devices/scan/trigger` (HTTP 202 Accepted) và `GET /network-devices/scan/status` (trả về `ScanStatusResponseDto`).
  - Giữ nguyên cơ chế broadcast WebSocket events (`DEVICE_DISCOVERED`, `DEVICE_SCAN_STARTED`, `DEVICE_SCAN_COMPLETED`).
  - Ném `NetworkDeviceError.ScanAlreadyInProgress` (HTTP 409 Conflict) nếu tiến trình quét đang diễn ra.

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

### Type Signatures & Code Contracts

1. **`NetworkDeviceRedisService` (`network-device-redis.service.ts`)**:
   - `acquireScanLock(token: string, ttlSeconds?: number): Promise<boolean>`: Thử lấy distributed mutex lock với Redis `SET ... EX ... NX`.
   - `releaseScanLock(token: string): Promise<boolean>`: Giải phóng lock an toàn bằng Lua script kiểm tra token sở hữu.
   - `getScanState(): Promise<ScanStatusResponseDto>`: Đọc và parse JSON trạng thái từ Redis key `network_device:scan_state`, fallback về `IDLE` nếu key chưa tồn tại.
   - `setScanState(state: Partial<ScanStatusResponseDto>, ttlSeconds?: number): Promise<void>`: Cập nhật JSON state kèm TTL tương ứng (e.g. 600s khi đang quét, 3600s sau khi hoàn tất).
   - `incrementDiscoveredCount(): Promise<number>`: Cập nhật tăng số lượng thiết bị phát hiện được trên Redis.

2. **Redis Constants (`network-device-redis.constant.ts`)**:
   - `NETWORK_DEVICE_SCAN_LOCK_KEY = 'network_device:scan_lock'`
   - `NETWORK_DEVICE_SCAN_STATE_KEY = 'network_device:scan_state'`
   - `NETWORK_DEVICE_SCAN_LOCK_TTL_SECONDS = 300` (5 phút)
   - `NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS = 600` (10 phút)
   - `NETWORK_DEVICE_SCAN_STATE_COMPLETED_TTL_SECONDS = 3600` (1 giờ)

### AST Seams & Callers

- **`network-device.module.ts`**: Cung cấp provider `Redis` (ioredis) từ `AppConfigService.redisConfig` và đăng ký `NetworkDeviceRedisService`.
- **`device-aggregator.service.ts`**:
  - Gỡ bỏ 4 biến in-memory instance properties (`discoveredCount`, `startedAt`, `completedAt`, `scanStatus`).
  - Inject `NetworkDeviceRedisService`.
  - Hàm `getScanStatus()` chuyển thành async đọc trực tiếp từ `networkDeviceRedisService.getScanState()`.
  - Hàm `scanAndAggregate()` lấy lock token (UUID) $\rightarrow$ khởi tạo state $\rightarrow$ scan $\rightarrow$ cập nhật counter $\rightarrow$ cập nhật completed state $\rightarrow$ giải phóng lock trong khối `finally`.
- **`device-aggregator.controller.ts`**: Hàm `getScanStatus()` gọi `await this.deviceAggregatorService.getScanStatus()`.

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
src/modules/network-device/
├── constants/
│   ├── [NEW]    network-device-redis.constant.ts  # Redis key names và TTL configurations
│   └── [MODIFY] index.ts                          # Export network-device-redis.constant
├── services/
│   ├── [NEW]    network-device-redis.service.ts   # Service quản lý Lock & State trên Redis
│   └── [MODIFY] device-aggregator.service.ts      # Chuyển đổi sang stateless dùng Redis
├── controllers/
│   └── [MODIFY] device-aggregator.controller.ts   # Await getScanStatus()
└── [MODIFY] network-device.module.ts              # Đăng ký Redis provider & Redis service
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[ ]` | `[NEW]` | `src/modules/network-device/constants/network-device-redis.constant.ts` | `NETWORK_DEVICE_SCAN_LOCK_KEY`, `NETWORK_DEVICE_SCAN_STATE_KEY`, TTL constants | `None` | `npm run build` |
| **2** | `[ ]` | `[MODIFY]` | `src/modules/network-device/constants/index.ts` | `export * from './network-device-redis.constant'` | `Order 1` | `npm run build` |
| **3** | `[ ]` | `[NEW]` | `src/modules/network-device/services/network-device-redis.service.ts` | `NetworkDeviceRedisService` | `Order 1, 2` | `npm run build` |
| **4** | `[ ]` | `[MODIFY]` | `src/modules/network-device/network-device.module.ts` | `NetworkDeviceModule` providers | `Order 3` | `npm run build` |
| **5** | `[ ]` | `[MODIFY]` | `src/modules/network-device/services/device-aggregator.service.ts` | `DeviceAggregatorService.scanAndAggregate`, `getScanStatus` | `Order 3, 4` | `npm run build` |
| **6** | `[ ]` | `[MODIFY]` | `src/modules/network-device/controllers/device-aggregator.controller.ts` | `DeviceAggregatorController.getScanStatus` | `Order 5` | `npm run build` |

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/modules/network-device/constants/network-device-redis.constant.ts`
> **Action**: Khởi tạo các constants cho Redis Keys và TTL của tiến trình quét mạng.

```typescript
export const NETWORK_DEVICE_SCAN_LOCK_KEY = 'network_device:scan_lock';
export const NETWORK_DEVICE_SCAN_STATE_KEY = 'network_device:scan_state';

export const NETWORK_DEVICE_SCAN_LOCK_TTL_SECONDS = 300; // 5 phút
export const NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS = 600; // 10 phút
export const NETWORK_DEVICE_SCAN_STATE_COMPLETED_TTL_SECONDS = 3600; // 1 giờ
```

### 2. `[MODIFY]` `src/modules/network-device/constants/index.ts`
> **Action**: Barrel export constants Redis mới tạo.

```diff
@@ -3,3 +3,4 @@
 export * from './onvif.constant';
 export * from './oui-database.constant';
 export * from './tcp-probe.constant';
+export * from './network-device-redis.constant';
```

### 3. `[NEW]` `src/modules/network-device/services/network-device-redis.service.ts`
> **Action**: Tạo service quản lý Distributed Lock và Shared Scan State trên Redis qua `ioredis`.

```typescript
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { LoggerService } from '../../../shared/services/logger.service';
import {
    NETWORK_DEVICE_SCAN_LOCK_KEY,
    NETWORK_DEVICE_SCAN_LOCK_TTL_SECONDS,
    NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
    NETWORK_DEVICE_SCAN_STATE_KEY,
} from '../constants';
import { ScanStatusResponseDto } from '../dtos/responses';
import { NetworkScanStatus } from '../enums';

@Injectable()
export class NetworkDeviceRedisService {
    private readonly logger = new LoggerService(NetworkDeviceRedisService.name);

    constructor(private readonly redisClient: Redis) {}

    async acquireScanLock(token: string, ttlSeconds = NETWORK_DEVICE_SCAN_LOCK_TTL_SECONDS): Promise<boolean> {
        try {
            const result = await this.redisClient.set(NETWORK_DEVICE_SCAN_LOCK_KEY, token, 'EX', ttlSeconds, 'NX');
            return result === 'OK';
        } catch (error) {
            this.logger.error(`Failed to acquire scan lock: ${(error as Error).message}`);
            return false;
        }
    }

    async releaseScanLock(token: string): Promise<boolean> {
        const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;

        try {
            const result = await this.redisClient.eval(luaScript, 1, NETWORK_DEVICE_SCAN_LOCK_KEY, token);
            return result === 1;
        } catch (error) {
            this.logger.error(`Failed to release scan lock: ${(error as Error).message}`);
            return false;
        }
    }

    async getScanState(): Promise<ScanStatusResponseDto> {
        try {
            const raw = await this.redisClient.get(NETWORK_DEVICE_SCAN_STATE_KEY);
            if (!raw) {
                return new ScanStatusResponseDto({
                    status: NetworkScanStatus.IDLE,
                    devicesDiscoveredCount: 0,
                    startedAt: null,
                    completedAt: null,
                });
            }

            const parsed = JSON.parse(raw);
            return new ScanStatusResponseDto(parsed);
        } catch (error) {
            this.logger.error(`Failed to get scan state from Redis: ${(error as Error).message}`);
            return new ScanStatusResponseDto({
                status: NetworkScanStatus.IDLE,
                devicesDiscoveredCount: 0,
                startedAt: null,
                completedAt: null,
            });
        }
    }

    async setScanState(
        state: Partial<ScanStatusResponseDto>,
        ttlSeconds = NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
    ): Promise<void> {
        try {
            const currentState = await this.getScanState();
            const merged = { ...currentState, ...state };
            await this.redisClient.set(NETWORK_DEVICE_SCAN_STATE_KEY, JSON.stringify(merged), 'EX', ttlSeconds);
        } catch (error) {
            this.logger.error(`Failed to set scan state in Redis: ${(error as Error).message}`);
        }
    }

    async incrementDiscoveredCount(): Promise<number> {
        try {
            const currentState = await this.getScanState();
            const newCount = (currentState.devicesDiscoveredCount || 0) + 1;
            currentState.devicesDiscoveredCount = newCount;
            await this.redisClient.set(
                NETWORK_DEVICE_SCAN_STATE_KEY,
                JSON.stringify(currentState),
                'EX',
                NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
            );
            return newCount;
        } catch (error) {
            this.logger.error(`Failed to increment discovered count: ${(error as Error).message}`);
            return 0;
        }
    }
}
```

### 4. `[MODIFY]` `src/modules/network-device/network-device.module.ts`
> **Action**: Đăng ký Redis provider và `NetworkDeviceRedisService`.

```diff
@@ -1,4 +1,7 @@
 import { Module } from '@nestjs/common';
 import { TypeOrmModule } from '@nestjs/typeorm';
+import Redis from 'ioredis';
 
+import { AppConfigService } from '../../shared/services/app-config.service';
 import { DeviceAggregatorController } from './controllers/device-aggregator.controller';
@@ -8,4 +11,5 @@
 import { ArpScanService } from './services/arp-scan.service';
 import { DeviceAggregatorService } from './services/device-aggregator.service';
+import { NetworkDeviceRedisService } from './services/network-device-redis.service';
 import { NetworkDeviceService } from './services/network-device.service';
@@ -21,4 +25,15 @@
         TcpPortProbeService,
         DeviceAggregatorService,
+        NetworkDeviceRedisService,
+        {
+            provide: Redis,
+            useFactory: (appConfigService: AppConfigService) => {
+                return new Redis({
+                    host: appConfigService?.redisConfig?.host,
+                    port: appConfigService?.redisConfig?.port,
+                    password: appConfigService?.redisConfig?.password,
+                });
+            },
+            inject: [AppConfigService],
+        },
         NetworkDeviceProfile,
     ],
```

### 5. `[MODIFY]` `src/modules/network-device/services/device-aggregator.service.ts`
> **Action**: Loại bỏ in-memory state properties, inject `NetworkDeviceRedisService`, dùng Distributed Lock và Shared Redis State.

```diff
@@ -1,4 +1,5 @@
+import * as crypto from 'node:crypto';
+
 import { Injectable } from '@nestjs/common';
 import { EventEmitter2 } from '@nestjs/event-emitter';
 import { isNil, omitBy, union } from 'lodash';
@@ -5,4 +6,9 @@
 import { LoggerService } from '../../../shared/services/logger.service';
 import { WebSocketEvent } from '../../websocket/enums/subscribe-name.enum';
+import {
+    NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
+    NETWORK_DEVICE_SCAN_STATE_COMPLETED_TTL_SECONDS,
+    NetworkDeviceError,
+} from '../constants';
 import { NetworkDeviceDto } from '../dtos';
 import { ScanStatusResponseDto } from '../dtos/responses';
@@ -12,4 +18,5 @@
 import { NetworkDeviceService } from './network-device.service';
 import { OnvifProbeService } from './onvif-probe.service';
+import { NetworkDeviceRedisService } from './network-device-redis.service';
 import { TcpPortProbeService } from './tcp-port-probe.service';
 
 @Injectable()
 export class DeviceAggregatorService {
-    private discoveredCount = 0;
-    private startedAt: Date | null = null;
-    private completedAt: Date | null = null;
-    private scanStatus: NetworkScanStatus = NetworkScanStatus.IDLE;
-
     constructor(
         private readonly eventEmitter: EventEmitter2,
         private readonly loggerService: LoggerService,
+        private readonly redisService: NetworkDeviceRedisService,
         private readonly arpScanService: ArpScanService,
         private readonly onvifProbeService: OnvifProbeService,
@@ -32,18 +39,26 @@
     ) {}
 
-    getScanStatus(): ScanStatusResponseDto {
-        return new ScanStatusResponseDto({
-            status: this.scanStatus,
-            devicesDiscoveredCount: this.discoveredCount,
-            startedAt: this.startedAt?.toISOString() || null,
-            completedAt: this.completedAt?.toISOString() || null,
-        });
+    async getScanStatus(): Promise<ScanStatusResponseDto> {
+        return this.redisService.getScanState();
     }
 
     async scanAndAggregate(subnet?: string, probeTimeoutMs = 3000): Promise<void> {
-        if (this.scanStatus === NetworkScanStatus.SCANNING) {
-            this.loggerService.warn('Scan is already in progress, ignoring duplicate trigger');
+        const lockToken = crypto.randomUUID();
+        const lockAcquired = await this.redisService.acquireScanLock(lockToken);
+
+        if (!lockAcquired) {
+            this.loggerService.warn('Scan is already in progress on another node, ignoring duplicate trigger');
+            throw NetworkDeviceError.ScanAlreadyInProgress;
+        }
+
+        const startedAt = new Date().toISOString();
+        await this.redisService.setScanState(
+            {
+                status: NetworkScanStatus.SCANNING,
+                devicesDiscoveredCount: 0,
+                startedAt,
+                completedAt: null,
+            },
+            NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
+        );
+
+        const startPayload: IScanStartedEventPayload = {
+            status: NetworkScanStatus.SCANNING,
+            startedAt,
+        };
+        this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_STARTED, startPayload);
+
         try {
             this.loggerService.log('Starting parallel Network Probing Pipeline (ONVIF, ARP, TCP)...');
 
@@ -58,18 +73,28 @@
             const mergedDevices = this.mergeProbeResults(probeResults);
             await this.persistAndBroadcastDevices(mergedDevices);
 
-            this.scanStatus = NetworkScanStatus.COMPLETED;
-            this.completedAt = new Date();
-            this.loggerService.log(`Network scan completed. Discovered ${this.discoveredCount} devices.`);
+            const finalState = await this.redisService.getScanState();
+            const completedAt = new Date().toISOString();
+
+            await this.redisService.setScanState(
+                {
+                    status: NetworkScanStatus.COMPLETED,
+                    completedAt,
+                },
+                NETWORK_DEVICE_SCAN_STATE_COMPLETED_TTL_SECONDS,
+            );
+
+            this.loggerService.log(`Network scan completed. Discovered ${finalState.devicesDiscoveredCount} devices.`);
 
             const completedPayload: IScanCompletedEventPayload = {
                 status: NetworkScanStatus.COMPLETED,
-                totalDiscovered: this.discoveredCount,
-                completedAt: this.completedAt.toISOString(),
+                totalDiscovered: finalState.devicesDiscoveredCount,
+                completedAt,
             };
             this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_COMPLETED, completedPayload);
         } catch (error) {
-            this.scanStatus = NetworkScanStatus.FAILED;
-            this.completedAt = new Date();
-            this.loggerService.error(`Network scan failed: ${error.message}`);
+            const completedAt = new Date().toISOString();
+            await this.redisService.setScanState({
+                status: NetworkScanStatus.FAILED,
+                completedAt,
+            });
+            this.loggerService.error(`Network scan failed: ${(error as Error).message}`);
+        } finally {
+            await this.redisService.releaseScanLock(lockToken);
         }
     }
@@ -128,4 +153,4 @@
     private async persistAndBroadcastDevices(devices: NetworkDeviceDto[]): Promise<void> {
         for (const device of devices) {
             const networkDevice = await this.networkDeviceService.upsertNetworkDevice(device);
-            this.discoveredCount++;
+            await this.redisService.incrementDiscoveredCount();
 
             const discoveredPayload: IDeviceDiscoveredEventPayload = { networkDevice };
```

### 6. `[MODIFY]` `src/modules/network-device/controllers/device-aggregator.controller.ts`
> **Action**: Await `getScanStatus()` từ `DeviceAggregatorService`.

```diff
@@ -35,5 +35,5 @@
     })
     async getScanStatus(): Promise<ScanStatusResponseDto> {
-        return this.deviceAggregatorService.getScanStatus();
+        return await this.deviceAggregatorService.getScanStatus();
     }
 }
```

## Section 5. Test Cases & Verification

### Automated Tests
- Kiểm tra toàn bộ mã nguồn biên dịch TypeScript và ESLint:
  ```bash
  ESLINT_USE_FLAT_CONFIG=false npx eslint --fix "src/modules/network-device/**/*.ts" && npm run build
  ```

### Manual Checks
1. **Kiểm tra Trigger Scan & Redis Lock**:
   - Gửi `POST /network-devices/scan/trigger` $\rightarrow$ Nhận HTTP 202 Accepted.
   - Gửi tiếp `POST /network-devices/scan/trigger` ngay lập tức $\rightarrow$ Nhận HTTP 409 Conflict (`network_device_scan_in_progress`).
2. **Kiểm tra Shared State trên Redis**:
   - Gọi `GET /network-devices/scan/status` trong lúc đang scan $\rightarrow$ Nhận `{ "status": "SCANNING", "devicesDiscoveredCount": N, ... }`.
   - Gọi lại sau khi scan xong $\rightarrow$ Nhận `{ "status": "COMPLETED", ... }`.
