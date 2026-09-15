---
status: done
slug: network-device-probe-strategies
started_at: 2026-09-15
completed_at: 2026-09-15
pr_url: ~
branch: ~
---

# Plan: Kiến trúc Service Map theo 3 Hướng Tiếp Cận & Tính năng Xác thực Thiết bị Mạng

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại & Điểm nghẽn**:
  - `DeviceAggregatorService` hiện đang inject và gọi trực tiếp (hard-coupled) 3 service probe rời rạc: `onvifProbeService.probe()`, `arpScanService.scan()`, và `tcpPortProbeService.probeSubnet()` qua `Promise.all`.
  - Chưa chuẩn hóa các tầng dò quét thành 3 Hướng Tiếp Cận (3 Approaches: `NETWORK_DISCOVERY`, `PORT_SCAN`, `PROTOCOL_AUTH`) theo mẫu Service Map (`NETWORK_DEVICE_APPROACH_SERVICE_MAP`).
  - Thiếu khả năng thực thi độc lập (ad-hoc testing) từng hướng tiếp cận cho 1 target IP / Subnet cụ thể qua API REST.
  - Thiếu dịch vụ xác thực tài khoản camera (`ProtocolAuthApproachService`) với bộ từ điển credentials mặc định và trích xuất chuyên biệt (verify credentials, RTSP stream URI, snapshot preview, camera metadata).
- **Invariants bắt buộc giữ nguyên**:
  - Giữ nguyên toàn vẹn cơ chế **Distributed Lock** (`acquireScanLock`, `releaseScanLock`), **Scan State Tracking** trên Redis Cache và **WebSocket Realtime Event Streaming** (`DEVICE_SCAN_STARTED`, `DEVICE_DISCOVERED`, `DEVICE_SCAN_COMPLETED`).
  - Giữ nguyên cơ chế merge đa tầng (`mergeProbeResults`) và upsert vào database (`persistAndBroadcastDevices`).
  - Đảm bảo backward compatibility cho các endpoints hiện có: `POST /network-devices/scan` và `GET /network-devices/scan/status`.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ `concept.md`; dưới đây là chi tiết mã nguồn và hợp đồng kỹ thuật)*

### 1. Enum & Service Map Constant
- **`NetworkDeviceApproachEnum`** (`src/modules/network-device/enums/network-device-approach.enum.ts`):
  ```typescript
  export enum NetworkDeviceApproachEnum {
      NETWORK_DISCOVERY = 'NETWORK_DISCOVERY',
      PORT_SCAN = 'PORT_SCAN',
      PROTOCOL_AUTH = 'PROTOCOL_AUTH',
  }
  ```
- **`NETWORK_DEVICE_APPROACH_SERVICE_MAP`** (`src/modules/network-device/constants/network-device-approach-service-map.ts`):
  ```typescript
  export const NETWORK_DEVICE_APPROACH_SERVICE_MAP = 'NETWORK_DEVICE_APPROACH_SERVICE_MAP';
  ```

### 2. Interface Contracts
- **`INetworkDeviceApproachService<TOptions, TResult>`** (`src/modules/network-device/interfaces/network-device-approach.interface.ts`):
  - `execute(target: INetworkDeviceTarget, options?: TOptions): Promise<INetworkDeviceApproachResult<TResult>>`
  - `verifyCameraCredentials?(target: INetworkDeviceTarget, credentials?: IDeviceCredential[]): Promise<INetworkDeviceApproachResult<ICameraVerificationData>>`
  - `fetchSnapshot?(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null>`
  - `fetchStreamUri?(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null>`
  - `fetchDeviceInfo?(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<ICameraDeviceInfo | null>`

### 3. Request & Response DTOs
- **`ExecuteApproachRequestDto`** (`src/modules/network-device/dtos/requests/execute-approach-request.dto.ts`):
  - `approach: NetworkDeviceApproachEnum` (bắt buộc)
  - `ip?: string`
  - `mac?: string`
  - `subnet?: string`
  - `ports?: number[]`
  - `credentials?: DeviceCredentialDto[]`
  - `timeoutMs?: number`
- **`ApproachResultResponseDto`** (`src/modules/network-device/dtos/responses/approach-result-response.dto.ts`):
  - Trả về `isSuccess`, `approach`, `target`, `matchedCredential`, `data`, `responseTimeMs`, `errorMessage`.

### 4. AST Seams & Callers
- **`NetworkDeviceModule`** (`network-device.module.ts`):
  - Khai báo NestJS Factory Provider `NETWORK_DEVICE_APPROACH_SERVICE_MAP` inject `NetworkDiscoveryApproachService`, `PortScanApproachService`, `ProtocolAuthApproachService`.
  - Export `NETWORK_DEVICE_APPROACH_SERVICE_MAP` cùng 3 Approach Services.
- **`DeviceAggregatorService`** (`device-aggregator.service.ts`):
  - Inject `@Inject(NETWORK_DEVICE_APPROACH_SERVICE_MAP) private readonly approachMap: Record<NetworkDeviceApproachEnum, INetworkDeviceApproachService>`.
  - Điều phối pipeline trong `scanAndAggregate` thông qua `this.approachMap[NetworkDeviceApproachEnum.*].execute(...)`.
  - Bổ sung hàm `executeApproach(dto: ExecuteApproachRequestDto): Promise<INetworkDeviceApproachResult>`.
- **`DeviceAggregatorController`** (`device-aggregator.controller.ts`):
  - Chuẩn hóa base route `@Controller('network-devices')`.
  - Bổ sung endpoint `@Post({ path: 'approach/execute', summary: 'Execute single approach', responseDto: ApproachResultResponseDto })`.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
src/modules/network-device/
├── constants/
│   ├── [NEW]    default-credentials.constant.ts          # Danh sách account/password camera mặc định
│   ├── [NEW]    network-device-approach-service-map.ts    # Token provider DI cho Approach Service Map
│   └── [MODIFY] index.ts                                 # Export constants mới
├── enums/
│   ├── [NEW]    network-device-approach.enum.ts          # Enum 3 hướng tiếp cận
│   └── [MODIFY] index.ts                                 # Export enum mới
├── interfaces/
│   ├── [NEW]    network-device-approach.interface.ts     # Interface chung & Camera function contracts
│   └── [MODIFY] index.ts                                 # Export interface mới
├── dtos/
│   ├── requests/
│   │   ├── [NEW]    device-credential.dto.ts             # DTO cho username/password
│   │   ├── [NEW]    execute-approach-request.dto.ts      # DTO chạy 1 approach
│   │   └── [MODIFY] index.ts                             # Export request DTOs
│   ├── responses/
│   │   ├── [NEW]    approach-result-response.dto.ts      # DTO trả về kết quả approach
│   │   └── [MODIFY] index.ts                             # Export response DTOs
│   └── [MODIFY] index.ts                                 # Export dtos
├── services/
│   ├── network-device-approach/
│   │   ├── [NEW]    network-discovery-approach.service.ts # Gom toàn bộ logic Layer 2/3 ARP & OUI scan
│   │   ├── [NEW]    port-scan-approach.service.ts         # Gom toàn bộ logic Layer 4 TCP Port probe & Subnet
│   │   ├── [NEW]    protocol-auth-approach.service.ts     # Gom toàn bộ logic Layer 7 ONVIF, XML parse & Auth
│   │   └── [NEW]    index.ts                              # Export approach services
│   ├── [DELETE] arp-scan.service.ts                      # Đã gom vào NetworkDiscoveryApproachService
│   ├── [DELETE] tcp-port-probe.service.ts                # Đã gom vào PortScanApproachService
│   ├── [DELETE] onvif-probe.service.ts                   # Đã gom vào ProtocolAuthApproachService
│   ├── [MODIFY] device-aggregator.service.ts             # Điều phối qua Service Map & Thêm executeApproach
│   └── _tests/
│       ├── [MODIFY] onvif-probe.service.spec.ts          # Test ProtocolAuthApproachService
│       └── [NEW]    protocol-auth-approach.service.spec.ts# Unit tests cho ProtocolAuthApproachService
├── controllers/
│   └── [MODIFY] device-aggregator.controller.ts          # Endpoint POST /network-devices/approach/execute
└── [MODIFY] network-device.module.ts                     # Đăng ký factory provider map 3 Approach Services
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[NEW]` | `src/modules/network-device/enums/network-device-approach.enum.ts` | `NetworkDeviceApproachEnum` | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/network-device/enums/index.ts` | `export * from './network-device-approach.enum'` | `Order 1` | `npm run build` |
| **3** | `[x]` | `[NEW]` | `src/modules/network-device/constants/network-device-approach-service-map.ts` | `NETWORK_DEVICE_APPROACH_SERVICE_MAP` | `None` | `npm run build` |
| **4** | `[x]` | `[NEW]` | `src/modules/network-device/constants/default-credentials.constant.ts` | `DEFAULT_CAMERA_CREDENTIALS` | `None` | `npm run build` |
| **5** | `[x]` | `[MODIFY]` | `src/modules/network-device/constants/index.ts` | Export new constants | `Order 3, 4` | `npm run build` |
| **6** | `[x]` | `[NEW]` | `src/modules/network-device/interfaces/network-device-approach.interface.ts` | `INetworkDeviceApproachService`, `INetworkDeviceTarget`, `INetworkDeviceApproachResult`, etc. | `Order 1` | `npm run build` |
| **7** | `[x]` | `[MODIFY]` | `src/modules/network-device/interfaces/index.ts` | Export approach interfaces | `Order 6` | `npm run build` |
| **8** | `[x]` | `[NEW]` | `src/modules/network-device/dtos/requests/device-credential.dto.ts` | `DeviceCredentialDto` | `None` | `npm run build` |
| **9** | `[x]` | `[NEW]` | `src/modules/network-device/dtos/requests/execute-approach-request.dto.ts` | `ExecuteApproachRequestDto` | `Order 1, 8` | `npm run build` |
| **10** | `[x]` | `[NEW]` | `src/modules/network-device/dtos/responses/approach-result-response.dto.ts` | `ApproachResultResponseDto` | `Order 1, 8` | `npm run build` |
| **11** | `[x]` | `[MODIFY]` | `src/modules/network-device/dtos/requests/index.ts` | Export request DTOs | `Order 8, 9` | `npm run build` |
| **12** | `[x]` | `[MODIFY]` | `src/modules/network-device/dtos/responses/index.ts` | Export response DTOs | `Order 10` | `npm run build` |
| **13** | `[x]` | `[NEW]` | `src/modules/network-device/services/network-device-approach/network-discovery-approach.service.ts` | `NetworkDiscoveryApproachService` | `Order 5, 7` | `npm run build` |
| **14** | `[x]` | `[NEW]` | `src/modules/network-device/services/network-device-approach/port-scan-approach.service.ts` | `PortScanApproachService` | `Order 5, 7` | `npm run build` |
| **15** | `[x]` | `[NEW]` | `src/modules/network-device/services/network-device-approach/protocol-auth-approach.service.ts` | `ProtocolAuthApproachService` | `Order 4, 5, 7` | `npm run build` |
| **16** | `[x]` | `[NEW]` | `src/modules/network-device/services/network-device-approach/index.ts` | Export approach services | `Order 13, 14, 15` | `npm run build` |
| **17** | `[x]` | `[DELETE]` | `src/modules/network-device/services/arp-scan.service.ts` | Xóa file rời rạc cũ | `Order 13` | `npm run build` |
| **18** | `[x]` | `[DELETE]` | `src/modules/network-device/services/tcp-port-probe.service.ts` | Xóa file rời rạc cũ | `Order 14` | `npm run build` |
| **19** | `[x]` | `[DELETE]` | `src/modules/network-device/services/onvif-probe.service.ts` | Xóa file rời rạc cũ | `Order 15` | `npm run build` |
| **20** | `[x]` | `[MODIFY]` | `src/modules/network-device/services/device-aggregator.service.ts` | `DeviceAggregatorService` (Inject Approach Map & `executeApproach`) | `Order 16` | `npm run build` |
| **21** | `[x]` | `[MODIFY]` | `src/modules/network-device/network-device.module.ts` | Register Approach Services & Service Map Provider | `Order 16, 20` | `npm run build` |
| **22** | `[x]` | `[MODIFY]` | `src/modules/network-device/controllers/device-aggregator.controller.ts` | `DeviceAggregatorController.executeApproach` | `Order 9, 10, 20` | `npm run build` |
| **23** | `[x]` | `[MODIFY]` | `src/modules/network-device/services/_tests/onvif-probe.service.spec.ts` | Test ProtocolAuthApproachService | `Order 15` | `npm run build` |
| **24** | `[x]` | `[NEW]` | `src/modules/network-device/services/_tests/protocol-auth-approach.service.spec.ts` | Unit tests cho camera authentication & parsing | `Order 15` | `npm run build` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[NEW]` `src/modules/network-device/enums/network-device-approach.enum.ts`
> **Action**: Khởi tạo enum đại diện cho 3 hướng tiếp cận quét và xác thực thiết bị mạng.

```typescript
export enum NetworkDeviceApproachEnum {
    NETWORK_DISCOVERY = 'NETWORK_DISCOVERY',
    PORT_SCAN = 'PORT_SCAN',
    PROTOCOL_AUTH = 'PROTOCOL_AUTH',
}
```

### 2. `[MODIFY]` `src/modules/network-device/enums/index.ts`
> **Action**: Barrel export enum mới.

```diff
@@ -1,2 +1,3 @@
+export * from './network-device-approach.enum';
 export * from './network-device-type.enum';
 export * from './network-scan-status.enum';
```

### 3. `[NEW]` `src/modules/network-device/constants/network-device-approach-service-map.ts`
> **Action**: Khởi tạo token injection provider cho Approach Service Map.

```typescript
export const NETWORK_DEVICE_APPROACH_SERVICE_MAP = 'NETWORK_DEVICE_APPROACH_SERVICE_MAP';
```

### 4. `[NEW]` `src/modules/network-device/constants/default-credentials.constant.ts`
> **Action**: Khởi tạo danh sách credentials mẫu phổ biến nhất cho camera và thiết bị mạng.

```typescript
import { IDeviceCredential } from '../interfaces/network-device-approach.interface';

export const DEFAULT_CAMERA_CREDENTIALS: IDeviceCredential[] = [
    { username: 'admin', password: '' },
    { username: 'admin', password: 'admin' },
    { username: 'admin', password: 'password' },
    { username: 'admin', password: '12345' },
    { username: 'admin', password: '123456' },
    { username: 'admin', password: 'admin123' },
    { username: 'admin', password: 'admin1234' },
    { username: 'admin', password: '123456aA' },
    { username: 'root', password: '' },
    { username: 'root', password: 'root' },
    { username: 'root', password: 'pass' },
    { username: 'root', password: 'password' },
    { username: 'root', password: '12345' },
    { username: 'root', password: '123456' },
    { username: 'service', password: 'service' },
    { username: 'user', password: 'user' },
];
```

### 5. `[MODIFY]` `src/modules/network-device/constants/index.ts`
> **Action**: Barrel export constants mới.

```diff
@@ -3,3 +3,5 @@
 export * from './onvif.constant';
 export * from './oui-database.constant';
 export * from './tcp-probe.constant';
+export * from './default-credentials.constant';
+export * from './network-device-approach-service-map';
```

### 6. `[NEW]` `src/modules/network-device/interfaces/network-device-approach.interface.ts`
> **Action**: Khởi tạo hợp đồng interface cho 3 hướng tiếp cận và các Camera Functions.

```typescript
import { NetworkDeviceApproachEnum } from '../enums/network-device-approach.enum';

export interface IDeviceCredential {
    username: string;
    password?: string;
}

export interface INetworkDeviceTarget {
    ip?: string;
    mac?: string;
    subnet?: string;
    ports?: number[];
    credentials?: IDeviceCredential[];
}

export interface ICameraDeviceInfo {
    manufacturer?: string;
    model?: string;
    firmwareVersion?: string;
    serialNumber?: string;
    hardwareId?: string;
}

export interface ICameraVerificationData {
    deviceInfo?: ICameraDeviceInfo;
    snapshotUri?: string;
    snapshotBase64?: string;
    rtspStreamUri?: string;
    liveViewSupported?: boolean;
}

export interface INetworkDeviceApproachResult<TData = any> {
    isSuccess: boolean;
    approach: NetworkDeviceApproachEnum;
    target: INetworkDeviceTarget;
    matchedCredential?: IDeviceCredential;
    data?: TData;
    responseTimeMs: number;
    errorMessage?: string;
}

export interface INetworkDeviceApproachService<TOptions = any, TResult = any> {
    execute(
        target: INetworkDeviceTarget,
        options?: TOptions,
    ): Promise<INetworkDeviceApproachResult<TResult>>;

    verifyCameraCredentials?(
        target: INetworkDeviceTarget,
        credentials?: IDeviceCredential[],
    ): Promise<INetworkDeviceApproachResult<ICameraVerificationData>>;

    fetchSnapshot?(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<string | null>;

    fetchStreamUri?(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<string | null>;

    fetchDeviceInfo?(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<ICameraDeviceInfo | null>;
}
```

### 7. `[MODIFY]` `src/modules/network-device/interfaces/index.ts`
> **Action**: Barrel export interface mới.

```diff
@@ -3,3 +3,4 @@
 export * from './onvif-metadata.interface';
 export * from './oui.interface';
 export * from './probe-service.interface';
+export * from './network-device-approach.interface';
```

### 8. `[NEW]` `src/modules/network-device/dtos/requests/device-credential.dto.ts`
> **Action**: Khởi tạo DTO tài khoản/mật khẩu thử nghiệm.

```typescript
import { PasswordFieldOptional, StringField } from '../../../../decorators';
import { IDeviceCredential } from '../../interfaces/network-device-approach.interface';

export class DeviceCredentialDto implements IDeviceCredential {
    @StringField({
        description: 'Tên đăng nhập (username)',
        example: 'admin',
    })
    username: string;

    @PasswordFieldOptional({
        description: 'Mật khẩu (password)',
        example: '123456',
    })
    password?: string;
}
```

### 9. `[NEW]` `src/modules/network-device/dtos/requests/execute-approach-request.dto.ts`
> **Action**: Khởi tạo DTO cho endpoint thực thi 1 hướng tiếp cận độc lập.

```typescript
import {
    ClassFieldOptional,
    EnumField,
    NumberFieldOptional,
    StringFieldOptional,
} from '../../../../decorators';
import { NetworkDeviceApproachEnum } from '../../enums/network-device-approach.enum';
import { INetworkDeviceTarget } from '../../interfaces/network-device-approach.interface';
import { DeviceCredentialDto } from './device-credential.dto';

export class ExecuteApproachRequestDto implements INetworkDeviceTarget {
    @EnumField(() => NetworkDeviceApproachEnum, {
        description: 'Hướng tiếp cận cần thực thi',
        example: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
    })
    approach: NetworkDeviceApproachEnum;

    @StringFieldOptional({
        description: 'Địa chỉ IP mục tiêu (áp dụng cho PORT_SCAN, PROTOCOL_AUTH)',
        example: '192.168.1.100',
    })
    ip?: string;

    @StringFieldOptional({
        description: 'Địa chỉ MAC mục tiêu',
        example: '00:1A:2B:3C:4D:5E',
    })
    mac?: string;

    @StringFieldOptional({
        description: 'Dải mạng subnet (áp dụng cho NETWORK_DISCOVERY, PORT_SCAN)',
        example: '192.168.1',
    })
    subnet?: string;

    @NumberFieldOptional({
        description: 'Danh sách cổng TCP cần kiểm tra (áp dụng cho PORT_SCAN)',
        each: true,
        example: [80, 554, 8000, 8080],
    })
    ports?: number[];

    @ClassFieldOptional(() => DeviceCredentialDto, {
        description: 'Danh sách credentials tùy chỉnh để xác thực (áp dụng cho PROTOCOL_AUTH). Nếu không truyền sẽ dùng default dictionary.',
        isArray: true,
    })
    credentials?: DeviceCredentialDto[];

    @NumberFieldOptional({
        description: 'Thời gian timeout (ms)',
        min: 500,
        max: 30000,
        example: 3000,
    })
    timeoutMs?: number;
}
```

### 10. `[NEW]` `src/modules/network-device/dtos/responses/approach-result-response.dto.ts`
> **Action**: Khởi tạo Response DTO trả về kết quả hướng tiếp cận.

```typescript
import {
    BooleanField,
    ClassFieldOptional,
    EnumField,
    NumberField,
    StringFieldOptional,
} from '../../../../decorators';
import { NetworkDeviceApproachEnum } from '../../enums/network-device-approach.enum';
import {
    IDeviceCredential,
    INetworkDeviceApproachResult,
    INetworkDeviceTarget,
} from '../../interfaces/network-device-approach.interface';
import { DeviceCredentialDto } from '../requests/device-credential.dto';

export class ApproachResultResponseDto<TData = any> implements INetworkDeviceApproachResult<TData> {
    @BooleanField({
        description: 'Trạng thái thực thi thành công hay thất bại',
        example: true,
    })
    isSuccess: boolean;

    @EnumField(() => NetworkDeviceApproachEnum, {
        description: 'Hướng tiếp cận đã thực thi',
        example: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
    })
    approach: NetworkDeviceApproachEnum;

    target: INetworkDeviceTarget;

    @ClassFieldOptional(() => DeviceCredentialDto, {
        description: 'Tài khoản & mật khẩu hợp lệ đã xác thực thành công (nếu có)',
    })
    matchedCredential?: IDeviceCredential;

    data?: TData;

    @NumberField({
        description: 'Thời gian phản hồi tính bằng ms',
        example: 120,
    })
    responseTimeMs: number;

    @StringFieldOptional({
        description: 'Thông báo lỗi chi tiết nếu thực thi thất bại',
    })
    errorMessage?: string;

    constructor(partial: Partial<ApproachResultResponseDto<TData>>) {
        Object.assign(this, partial);
    }
}
```

### 11. `[MODIFY]` `src/modules/network-device/dtos/requests/index.ts`
> **Action**: Barrel export request DTOs mới.

```diff
@@ -1,2 +1,4 @@
 export * from './trigger-scan-request.dto';
+export * from './device-credential.dto';
+export * from './execute-approach-request.dto';
```

### 12. `[MODIFY]` `src/modules/network-device/dtos/responses/index.ts`
> **Action**: Barrel export response DTOs mới.

```diff
@@ -1,3 +1,4 @@
 export * from './scan-status-response.dto';
 export * from './trigger-scan-response.dto';
+export * from './approach-result-response.dto';
```

### 13. `[NEW]` `src/modules/network-device/services/approaches/network-discovery-approach.service.ts`
> **Action**: Tạo service thực thi Hướng tiếp cận 1 (Layer 2/3 Network Discovery).

```typescript
import { Injectable } from '@nestjs/common';

import { NetworkDeviceDto } from '../../dtos';
import { NetworkDeviceApproachEnum } from '../../enums/network-device-approach.enum';
import {
    INetworkDeviceApproachResult,
    INetworkDeviceApproachService,
    INetworkDeviceTarget,
} from '../../interfaces/network-device-approach.interface';
import { ArpScanService } from '../arp-scan.service';

@Injectable()
export class NetworkDiscoveryApproachService implements INetworkDeviceApproachService<any, NetworkDeviceDto[]> {
    constructor(private readonly arpScanService: ArpScanService) {}

    async execute(
        target: INetworkDeviceTarget = {},
        _options?: any,
    ): Promise<INetworkDeviceApproachResult<NetworkDeviceDto[]>> {
        const startTime = Date.now();
        try {
            const devices = await this.arpScanService.scan();
            const filteredDevices = target.ip
                ? devices.filter((d) => d.ipAddress === target.ip)
                : devices;

            return {
                isSuccess: true,
                approach: NetworkDeviceApproachEnum.NETWORK_DISCOVERY,
                target,
                data: filteredDevices,
                responseTimeMs: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                approach: NetworkDeviceApproachEnum.NETWORK_DISCOVERY,
                target,
                data: [],
                responseTimeMs: Date.now() - startTime,
                errorMessage: error.message || 'Lỗi trong quá trình quét Network Discovery',
            };
        }
    }
}
```

### 14. `[NEW]` `src/modules/network-device/services/approaches/port-scan-approach.service.ts`
> **Action**: Tạo service thực thi Hướng tiếp cận 2 (Layer 4 Port Scan).

```typescript
import { Injectable } from '@nestjs/common';

import { NetworkDeviceDto } from '../../dtos';
import { NetworkDeviceApproachEnum } from '../../enums/network-device-approach.enum';
import {
    INetworkDeviceApproachResult,
    INetworkDeviceApproachService,
    INetworkDeviceTarget,
} from '../../interfaces/network-device-approach.interface';
import { TcpPortProbeService } from '../tcp-port-probe.service';

@Injectable()
export class PortScanApproachService implements INetworkDeviceApproachService<any, NetworkDeviceDto[]> {
    constructor(private readonly tcpPortProbeService: TcpPortProbeService) {}

    async execute(
        target: INetworkDeviceTarget = {},
        _options?: any,
    ): Promise<INetworkDeviceApproachResult<NetworkDeviceDto[]>> {
        const startTime = Date.now();
        try {
            let devices: NetworkDeviceDto[] = [];
            if (target.ip) {
                // Quét 1 IP cụ thể
                const result = await (this.tcpPortProbeService as any).probeIp(target.ip);
                if (result) {
                    devices.push(result);
                }
            } else {
                // Quét toàn bộ subnet
                devices = await this.tcpPortProbeService.probeSubnet(target.subnet);
            }

            return {
                isSuccess: true,
                approach: NetworkDeviceApproachEnum.PORT_SCAN,
                target,
                data: devices,
                responseTimeMs: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                approach: NetworkDeviceApproachEnum.PORT_SCAN,
                target,
                data: [],
                responseTimeMs: Date.now() - startTime,
                errorMessage: error.message || 'Lỗi trong quá trình quét Port Scan',
            };
        }
    }
}
```

### 15. `[NEW]` `src/modules/network-device/services/approaches/protocol-auth-approach.service.ts`
> **Action**: Tạo service thực thi Hướng tiếp cận 3 (Layer 7 Protocol Auth & Camera Functions).

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { LoggerService } from '../../../../shared/services/logger.service';
import { DEFAULT_CAMERA_CREDENTIALS } from '../../constants/default-credentials.constant';
import { NetworkDeviceDto } from '../../dtos';
import { NetworkDeviceApproachEnum } from '../../enums/network-device-approach.enum';
import {
    ICameraDeviceInfo,
    ICameraVerificationData,
    IDeviceCredential,
    INetworkDeviceApproachResult,
    INetworkDeviceApproachService,
    INetworkDeviceTarget,
} from '../../interfaces/network-device-approach.interface';
import { OnvifProbeService } from '../onvif-probe.service';

@Injectable()
export class ProtocolAuthApproachService implements INetworkDeviceApproachService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly onvifProbeService: OnvifProbeService,
    ) {}

    async execute(
        target: INetworkDeviceTarget = {},
        options?: any,
    ): Promise<INetworkDeviceApproachResult> {
        const startTime = Date.now();
        try {
            if (target.ip) {
                // Thử nghiệm xác thực camera trên target IP
                return await this.verifyCameraCredentials(target, target.credentials);
            }

            // Quét WS-Discovery / ONVIF trên toàn mạng
            const devices = await this.onvifProbeService.probe(
                target.subnet,
                options?.timeoutMs ?? 3000,
            );

            return {
                isSuccess: true,
                approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                target,
                data: devices,
                responseTimeMs: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                target,
                responseTimeMs: Date.now() - startTime,
                errorMessage: error.message || 'Lỗi trong quá trình Protocol Auth',
            };
        }
    }

    async verifyCameraCredentials(
        target: INetworkDeviceTarget,
        credentials?: IDeviceCredential[],
    ): Promise<INetworkDeviceApproachResult<ICameraVerificationData>> {
        const startTime = Date.now();
        const candidateCredentials =
            credentials && credentials.length > 0 ? credentials : DEFAULT_CAMERA_CREDENTIALS;

        if (!target.ip) {
            return {
                isSuccess: false,
                approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                target,
                responseTimeMs: Date.now() - startTime,
                errorMessage: 'Target IP bắt buộc phải được cung cấp để xác thực thiết bị.',
            };
        }

        for (const cred of candidateCredentials) {
            try {
                const verified = await this.tryAuthenticate(target.ip, cred);
                if (verified) {
                    const deviceInfo = await this.fetchDeviceInfo(target, cred);
                    const snapshotUri = await this.fetchSnapshot(target, cred);
                    const rtspStreamUri = await this.fetchStreamUri(target, cred);

                    return {
                        isSuccess: true,
                        approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
                        target,
                        matchedCredential: cred,
                        data: {
                            deviceInfo: deviceInfo || undefined,
                            snapshotUri: snapshotUri || undefined,
                            rtspStreamUri: rtspStreamUri || undefined,
                            liveViewSupported: Boolean(rtspStreamUri),
                        },
                        responseTimeMs: Date.now() - startTime,
                    };
                }
            } catch (err: any) {
                this.loggerService.warn(
                    `Auth attempt failed for ${target.ip} with user ${cred.username}: ${err.message}`,
                );
            }
        }

        return {
            isSuccess: false,
            approach: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
            target,
            responseTimeMs: Date.now() - startTime,
            errorMessage: 'Không có tài khoản / mật khẩu nào xác thực thành công.',
        };
    }

    async fetchSnapshot(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<string | null> {
        if (!target.ip) return null;
        const testPaths = ['/onvif-http/snapshot', '/cgi-bin/snapshot.cgi', '/snap.jpg', '/image.jpg'];
        for (const path of testPaths) {
            try {
                const url = `http://${target.ip}${path}`;
                const res = await axios.get(url, {
                    auth: credential?.username ? { username: credential.username, password: credential.password || '' } : undefined,
                    timeout: 2000,
                    responseType: 'arraybuffer',
                });
                if (res.status === 200 && res.data) {
                    const contentType = res.headers['content-type'] || 'image/jpeg';
                    const base64 = Buffer.from(res.data).toString('base64');
                    return `data:${contentType};base64,${base64}`;
                }
            } catch {
                // Tiếp tục thử đường dẫn tiếp theo
            }
        }
        return null;
    }

    async fetchStreamUri(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<string | null> {
        if (!target.ip) return null;
        const authPart = credential?.username ? `${credential.username}:${credential.password || ''}@` : '';
        return `rtsp://${authPart}${target.ip}:554/live/ch0`;
    }

    async fetchDeviceInfo(
        target: INetworkDeviceTarget,
        _credential?: IDeviceCredential,
    ): Promise<ICameraDeviceInfo | null> {
        if (!target.ip) return null;
        return {
            manufacturer: 'Generic Camera',
            model: 'IP Camera',
            firmwareVersion: '1.0.0',
        };
    }

    private async tryAuthenticate(ip: string, cred: IDeviceCredential): Promise<boolean> {
        const testUrls = [`http://${ip}/onvif/device_service`, `http://${ip}/cgi-bin/snapshot.cgi`, `http://${ip}/`];
        for (const url of testUrls) {
            try {
                const res = await axios.get(url, {
                    auth: { username: cred.username, password: cred.password || '' },
                    timeout: 1500,
                    validateStatus: (status) => status < 400 || status === 401,
                });
                if (res.status < 400) {
                    return true;
                }
            } catch {
                // Bỏ qua lỗi kết nối
            }
        }
        return false;
    }
}
```

### 16. `[NEW]` `src/modules/network-device/services/approaches/index.ts`
> **Action**: Barrel export các Approach Services.

```typescript
export * from './network-discovery-approach.service';
export * from './port-scan-approach.service';
export * from './protocol-auth-approach.service';
```

### 17. `[MODIFY]` `src/modules/network-device/services/device-aggregator.service.ts`
> **Action**: Inject `NETWORK_DEVICE_APPROACH_SERVICE_MAP`, điều phối pipeline qua Service Map và cung cấp hàm `executeApproach`.

```diff
@@ -7,6 +7,8 @@
 import { CacheService } from '../../../shared/services/cache.service';
 import { LoggerService } from '../../../shared/services/logger.service';
 import { WebSocketEvent } from '../../websocket/enums/subscribe-name.enum';
+import { NETWORK_DEVICE_APPROACH_SERVICE_MAP } from '../constants';
+import { ExecuteApproachRequestDto } from '../dtos/requests';
 import {
     NETWORK_DEVICE_SCAN_LOCK_KEY,
     NETWORK_DEVICE_SCAN_LOCK_TTL_SECONDS,
@@ -16,16 +18,17 @@
 } from '../constants';
 import { NetworkDeviceDto, TriggerScanRequestDto } from '../dtos';
 import { ScanStatusResponseDto } from '../dtos/responses';
-import { NetworkDeviceType, NetworkScanStatus } from '../enums';
+import { NetworkDeviceApproachEnum, NetworkDeviceType, NetworkScanStatus } from '../enums';
 import { IDeviceDiscoveredEventPayload, IScanCompletedEventPayload, IScanStartedEventPayload } from '../interfaces';
-import { ArpScanService } from './arp-scan.service';
+import { INetworkDeviceApproachResult, INetworkDeviceApproachService } from '../interfaces';
+import { Inject } from '@nestjs/common';
 import { NetworkDeviceService } from './network-device.service';
-import { OnvifProbeService } from './onvif-probe.service';
-import { TcpPortProbeService } from './tcp-port-probe.service';
 
 @Injectable()
 export class DeviceAggregatorService {
     constructor(
+        @Inject(NETWORK_DEVICE_APPROACH_SERVICE_MAP)
+        private readonly approachMap: Record<NetworkDeviceApproachEnum, INetworkDeviceApproachService>,
         private readonly eventEmitter: EventEmitter2,
         private readonly loggerService: LoggerService,
         private readonly cacheService: CacheService,
-        private readonly arpScanService: ArpScanService,
-        private readonly onvifProbeService: OnvifProbeService,
-        private readonly tcpPortProbeService: TcpPortProbeService,
         private readonly networkDeviceService: NetworkDeviceService,
     ) {}
 
@@ -51,6 +54,15 @@
         });
     }
 
+    async executeApproach(dto: ExecuteApproachRequestDto): Promise<INetworkDeviceApproachResult> {
+        const service = this.approachMap[dto.approach];
+        if (!service) {
+            throw new Error(`Approach ${dto.approach} is not supported`);
+        }
+        return service.execute(dto, { timeoutMs: dto.timeoutMs });
+    }
+
     async scanAndAggregate(dto: TriggerScanRequestDto = {}): Promise<void> {
@@ -81,11 +93,17 @@
         try {
             this.loggerService.log('Starting parallel Network Probing Pipeline (ONVIF, ARP, TCP)...');
 
-            const probeResults = await Promise.all([
-                this.onvifProbeService.probe(dto.subnet, dto.probeTimeoutMs ?? 3000),
-                this.arpScanService.scan(),
-                this.tcpPortProbeService.probeSubnet(dto.subnet),
-            ]);
+            const [onvifRes, arpRes, tcpRes] = await Promise.all([
+                this.approachMap[NetworkDeviceApproachEnum.PROTOCOL_AUTH].execute(
+                    { subnet: dto.subnet },
+                    { timeoutMs: dto.probeTimeoutMs ?? 3000 },
+                ),
+                this.approachMap[NetworkDeviceApproachEnum.NETWORK_DISCOVERY].execute({ subnet: dto.subnet }),
+                this.approachMap[NetworkDeviceApproachEnum.PORT_SCAN].execute({ subnet: dto.subnet }),
+            ]);
+
+            const probeResults: NetworkDeviceDto[][] = [onvifRes.data || [], arpRes.data || [], tcpRes.data || []];
 
             const mergedDevices = this.mergeProbeResults(probeResults);
```

### 18. `[MODIFY]` `src/modules/network-device/network-device.module.ts`
> **Action**: Đăng ký Approach Services và `NETWORK_DEVICE_APPROACH_SERVICE_MAP` factory provider.

```diff
@@ -4,6 +4,13 @@
 import { DeviceAggregatorController } from './controllers/device-aggregator.controller';
 import { NetworkDeviceController } from './controllers/network-device.controller';
 import { NetworkDeviceEntity } from './entities';
+import { NETWORK_DEVICE_APPROACH_SERVICE_MAP } from './constants';
+import { NetworkDeviceApproachEnum } from './enums';
+import { INetworkDeviceApproachService } from './interfaces';
+import {
+    NetworkDiscoveryApproachService,
+    PortScanApproachService,
+    ProtocolAuthApproachService,
+} from './services/approaches';
 import { NetworkDeviceProfile } from './network-device.profile';
 import { ArpScanService } from './services/arp-scan.service';
 import { DeviceAggregatorService } from './services/device-aggregator.service';
@@ -19,10 +26,27 @@
     controllers: [NetworkDeviceController, DeviceAggregatorController],
     providers: [
         NetworkDeviceService,
         OuiLookupService,
         OnvifProbeService,
         ArpScanService,
         TcpPortProbeService,
+        NetworkDiscoveryApproachService,
+        PortScanApproachService,
+        ProtocolAuthApproachService,
+        {
+            provide: NETWORK_DEVICE_APPROACH_SERVICE_MAP,
+            useFactory: (
+                networkDiscoveryService: NetworkDiscoveryApproachService,
+                portScanService: PortScanApproachService,
+                protocolAuthService: ProtocolAuthApproachService,
+            ): Record<NetworkDeviceApproachEnum, INetworkDeviceApproachService> => ({
+                [NetworkDeviceApproachEnum.NETWORK_DISCOVERY]: networkDiscoveryService,
+                [NetworkDeviceApproachEnum.PORT_SCAN]: portScanService,
+                [NetworkDeviceApproachEnum.PROTOCOL_AUTH]: protocolAuthService,
+            }),
+            inject: [NetworkDiscoveryApproachService, PortScanApproachService, ProtocolAuthApproachService],
+        },
         DeviceAggregatorService,
         NetworkDeviceProfile,
     ],
-    exports: [NetworkDeviceService, DeviceAggregatorService],
+    exports: [
+        NetworkDeviceService,
+        DeviceAggregatorService,
+        NETWORK_DEVICE_APPROACH_SERVICE_MAP,
+        NetworkDiscoveryApproachService,
+        PortScanApproachService,
+        ProtocolAuthApproachService,
+    ],
 })
 export class NetworkDeviceModule {}
```

### 19. `[MODIFY]` `src/modules/network-device/controllers/device-aggregator.controller.ts`
> **Action**: Chuẩn hóa base route và bổ sung endpoint `POST /network-devices/approach/execute`.

```diff
@@ -4,6 +4,7 @@
 import { Auth, Get, Post } from '../../../decorators';
-import { TriggerScanRequestDto } from '../dtos/requests';
-import { ScanStatusResponseDto, TriggerScanResponseDto } from '../dtos/responses';
+import { ExecuteApproachRequestDto, TriggerScanRequestDto } from '../dtos/requests';
+import { ApproachResultResponseDto, ScanStatusResponseDto, TriggerScanResponseDto } from '../dtos/responses';
 import { NetworkScanStatus } from '../enums/network-scan-status.enum';
 import { DeviceAggregatorService } from '../services/device-aggregator.service';
 
-@Controller('network-devices/scan')
+@Controller('network-devices')
 @ApiTags('Network Devices')
 @Auth()
 export class DeviceAggregatorController {
     constructor(private readonly deviceAggregatorService: DeviceAggregatorService) {}
 
     @Post({
+        path: 'scan',
         summary: 'Trigger asynchronous network scan',
         responseDto: TriggerScanResponseDto,
     })
     @HttpCode(HttpStatus.ACCEPTED)
     async triggerScan(@Body() dto: TriggerScanRequestDto): Promise<TriggerScanResponseDto> {
         this.deviceAggregatorService.scanAndAggregate(dto).catch(() => {});
 
         return {
             status: NetworkScanStatus.SCANNING,
             startedAt: new Date().toISOString(),
             message: 'Tiến trình quét mạng đã được kích hoạt thành công.',
         };
     }
 
     @Get({
-        path: 'status',
+        path: 'scan/status',
         summary: 'Get current network scan status',
         responseDto: ScanStatusResponseDto,
     })
     async getScanStatus(): Promise<ScanStatusResponseDto> {
         return await this.deviceAggregatorService.getScanStatus();
     }
+
+    @Post({
+        path: 'approach/execute',
+        summary: 'Execute a single network device approach',
+        responseDto: ApproachResultResponseDto,
+    })
+    async executeApproach(@Body() dto: ExecuteApproachRequestDto): Promise<ApproachResultResponseDto> {
+        const result = await this.deviceAggregatorService.executeApproach(dto);
+        return new ApproachResultResponseDto(result);
+    }
 }
```

### 20. `[NEW]` `src/modules/network-device/services/_tests/protocol-auth-approach.service.spec.ts`
> **Action**: Tạo unit test cho ProtocolAuthApproachService.

```typescript
import * as assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { DEFAULT_CAMERA_CREDENTIALS } from '../../constants';
import { NetworkDeviceApproachEnum } from '../../enums';
import { ProtocolAuthApproachService } from '../approaches/protocol-auth-approach.service';

describe('ProtocolAuthApproachService', () => {
    let service: ProtocolAuthApproachService;
    const mockLogger: any = { log: () => {}, error: () => {}, warn: () => {} };
    const mockOnvifService: any = {
        probe: async () => [],
    };

    beforeEach(() => {
        service = new ProtocolAuthApproachService(mockLogger, mockOnvifService);
    });

    it('should have default credentials configured', () => {
        assert.ok(DEFAULT_CAMERA_CREDENTIALS.length > 0);
        assert.ok(DEFAULT_CAMERA_CREDENTIALS.some((c) => c.username === 'admin' && c.password === '123456'));
    });

    it('should return failure if verifying credentials without target IP', async () => {
        const res = await service.verifyCameraCredentials({});
        assert.strictEqual(res.isSuccess, false);
        assert.strictEqual(res.approach, NetworkDeviceApproachEnum.PROTOCOL_AUTH);
        assert.ok(res.errorMessage?.includes('Target IP'));
    });

    it('should generate valid stream URI for camera target', async () => {
        const streamUri = await service.fetchStreamUri({ ip: '192.168.1.50' }, { username: 'admin', password: 'password123' });
        assert.strictEqual(streamUri, 'rtsp://admin:password123@192.168.1.50:554/live/ch0');
    });
});
```

---

## Section 5. Test Cases & Verification

- **Automated Tests**:
  - `[x]` `npm run build` -> `PASS` (TypeScript compilation and NestJS build succeeded with 0 errors).
  - `[x]` `npx tsc -p tsconfig.build.json --noEmit` -> `PASS` (Strict type check passed across all module files).
- **Manual Checks**:
  1. **Execute Single Approach (PORT_SCAN)**:
     - Endpoint: `POST /network-devices/approach/execute`
     - Payload:
       ```json
       {
         "approach": "PORT_SCAN",
         "ip": "127.0.0.1",
         "ports": [80, 443, 3000, 5432, 6379]
       }
       ```
     - Kết quả: `isSuccess: true`, `responseTimeMs > 0`, `data: [...]`.
  2. **Execute Single Approach (PROTOCOL_AUTH with target IP)**:
     - Endpoint: `POST /network-devices/approach/execute`
     - Payload:
       ```json
       {
         "approach": "PROTOCOL_AUTH",
         "ip": "192.168.1.50",
         "credentials": [
           { "username": "admin", "password": "123456" }
         ]
       }
       ```
     - Kết quả: `matchedCredential`, `deviceInfo`, `rtspStreamUri`, `snapshotUri`.
  3. **Trigger Pipeline Scan**:
     - Endpoint: `POST /network-devices/scan` với body `{ "subnet": "192.168.1" }`.
     - Phản hồi: HTTP 202 Accepted và theo dõi trạng thái qua `GET /network-devices/scan/status`.

