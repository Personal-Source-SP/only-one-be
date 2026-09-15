---
status: done
slug: network-device-discovery
started_at: 2026-09-15
completed_at: 2026-09-15
pr_url: ~
branch: ~
---

# Plan: Triển khai Module Network Device Discovery (Phát hiện & Nhận diện Thiết bị Mạng LAN/Wi-Fi)

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: Backend NestJS chưa có khả năng tự động rà quét subnet mạng nội bộ (LAN/Wi-Fi). Các thiết bị ngoại vi và IP Camera (Hikvision, Dahua, Ezviz, TP-Link...) cần phải được thêm thủ công từng địa chỉ IP tĩnh và port.
- **Điểm nghẽn kỹ thuật**: Thiếu cơ chế kết hợp đa phương thức probe (UDP Multicast WS-Discovery, ARP inspection, OUI MAC matching, TCP Port Probe). Nếu chỉ dùng 1 phương pháp đơn lẻ (ví dụ UDP broadcast) thì sẽ bị chặn bởi các router/firewall không hỗ trợ multicast; nếu chỉ quét TCP port toàn bộ subnet thì dễ gây cạn kiệt socket và nghẽn network I/O.
- **Invariants bắt buộc duy trì**:
  - Không phá vỡ cấu trúc routing và kiến trúc `BaseController` / `BaseService` chuẩn của hệ thống.
  - Sử dụng `EventEmitter2` để phát sự kiện realtime qua `WebsocketGateway` nhằm giữ cho tầng Network Scanner hoàn toàn decoupled với WebSocket.
  - Luôn kiểm soát concurrency và socket timeout (300-500ms) để không gây block event loop hoặc cạn kiệt file descriptors của hệ thống.
  - Tuân thủ nghiêm ngặt chuẩn DTO composite decorators (`@StringField`, `@EnumField`, `@BooleanField`...) và AutoMapper profile.
  - **Quy chuẩn định kiểu (Type Invariant)**: Tuyệt đối không khai báo kiểu vô danh dạng inline `{ a: string }` hay `Record<string, any>` lỏng lẻo. Tất cả cấu trúc dữ liệu, event payload, parser result và dictionary entries đều phải được định nghĩa bằng các `interface` rõ ràng.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ [concept.md](file:///Users/kiem/Sources/PERSONAL/only-one-be/only-one/tasks/20260915-133918-network-device-discovery/concept.md); không mô tả lại giải pháp tổng quan)*

### 2.1 Enums & Explicit Interfaces

```typescript
export enum DeviceType {
    CAMERA = 'CAMERA',
    ROUTER_AP = 'ROUTER_AP',
    COMPUTER_PHONE = 'COMPUTER_PHONE',
    SMART_IOT = 'SMART_IOT',
    PRINTER = 'PRINTER',
    UNKNOWN = 'UNKNOWN',
}

export enum ScanStatus {
    IDLE = 'IDLE',
    SCANNING = 'SCANNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export interface IOnvifMetadata {
    xAddrs?: string[];
    types?: string;
    scopes?: string[];
    rawXml?: string;
}

export interface IDiscoveredDevice {
    ipAddress: string;
    macAddress?: string;
    vendor?: string;
    model?: string;
    firmwareVersion?: string;
    deviceType: DeviceType;
    openPorts: number[];
    onvifMetadata?: IOnvifMetadata;
    isOnline: boolean;
    lastSeenAt: Date;
}

export interface IOuiEntry {
    vendor: string;
    defaultType?: DeviceType;
}

export interface IOuiLookupResult {
    vendor?: string;
    defaultType?: DeviceType;
}

export interface IArpEntry {
    ip: string;
    mac: string;
}

export interface IScanStatusData {
    status: ScanStatus;
    startedAt?: string | null;
    completedAt?: string | null;
    devicesDiscoveredCount: number;
}

export interface IDeviceDiscoveredEventPayload {
    device: IDiscoveredDevice;
}

export interface IScanStartedEventPayload {
    status: ScanStatus;
    startedAt: string;
}

export interface IScanCompletedEventPayload {
    status: ScanStatus;
    totalDiscovered: number;
    completedAt: string;
}
```

### 2.2 AST Seams & Callers
- **`AppModule` (`src/app.module.ts`)**: Đăng ký `NetworkDeviceModule` vào mảng `imports`.
- **`WebsocketModule` (`src/modules/websocket/`)**:
  - `SubscribeName`: Thêm `DEVICE_DISCOVERED`, `DEVICE_SCAN_STARTED`, `DEVICE_SCAN_COMPLETED`.
  - `WebSocketEvent`: Thêm `DEVICE_DISCOVERED`, `DEVICE_SCAN_STARTED`, `DEVICE_SCAN_COMPLETED`.
  - `NetworkDeviceSocketService`: Listener lắng nghe `@OnEvent(WebSocketEvent.DEVICE_DISCOVERED)` và broadcast tới client.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes

```text
src/
├── app.module.ts                                          # [MODIFY] Đăng ký NetworkDeviceModule
├── modules/
│   ├── websocket/
│   │   ├── enums/
│   │   │   └── subscribe-name.enum.ts                    # [MODIFY] Thêm WebSocketEvent & SubscribeName cho Device Discovery
│   │   ├── services/
│   │   │   └── [NEW] network-device.socket.service.ts    # [NEW] Listener emit socket realtime khi có event thiết bị
│   │   └── websocket.module.ts                            # [MODIFY] Đăng ký NetworkDeviceSocketService
│   └── network-device/                                    # [NEW MODULE]
│       ├── constants/
│       │   ├── [NEW] network-device-error.ts             # AppException Error definitions
│       │   ├── [NEW] network-device-pagination.config.ts # PaginateConfig cho NetworkDeviceEntity
│       │   └── [NEW] oui-database.constant.ts            # Từ điển OUI Vendor MAC Offline
│       ├── controllers/
│       │   └── [NEW] network-device.controller.ts        # REST Controller (CRUD + trigger /scan)
│       ├── dtos/
│       │   ├── [NEW] network-device.dto.ts               # Response DTO cho NetworkDevice
│       │   ├── requests/
│       │   │   └── [NEW] trigger-scan-request.dto.ts     # DTO tham số quét (subnet, timeout)
│       │   └── responses/
│       │       ├── [NEW] scan-status-response.dto.ts     # DTO trạng thái scan hiện tại
│       │       └── [NEW] trigger-scan-response.dto.ts    # DTO phản hồi khi kích hoạt scan
│       ├── entities/
│       │   └── [NEW] network-device.entity.ts            # TypeORM Entity lưu vào Postgres
│       ├── enums/
│       │   ├── [NEW] device-type.enum.ts                 # DeviceType Enum
│       │   ├── [NEW] scan-status.enum.ts                 # ScanStatus Enum
│       │   └── [NEW] index.ts
│       ├── interfaces/
│       │   ├── [NEW] network-device.interface.ts         # Data contracts & explicit interfaces
│       │   ├── [NEW] probe-service.interface.ts          # Generic probe interface
│       │   └── [NEW] index.ts
│       ├── services/
│       │   ├── [NEW] arp-scan.service.ts                 # Quét ARP table & MAC parsing
│       │   ├── [NEW] onvif-probe.service.ts              # UDP Multicast WS-Discovery Probe
│       │   ├── [NEW] oui-lookup.service.ts               # Tra cứu Vendor theo MAC OUI
│       │   ├── [NEW] tcp-port-probe.service.ts           # Quét cổng TCP với Concurrency Limiter
│       │   ├── [NEW] device-aggregator.service.ts        # Điều phối 3 probe, gộp dữ liệu & emit event
│       │   └── [NEW] network-device.service.ts           # CRUD Service kết thừa BaseService
│       ├── [NEW] network-device.profile.ts               # AutoMapper Profile
│       └── [NEW] network-device.module.ts                # NestJS Module definition
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/websocket/enums/subscribe-name.enum.ts` | `SubscribeName`, `WebSocketEvent` | `None` | `npm run lint` |
| **2** | `[x]` | `[NEW]` | `src/modules/network-device/enums/device-type.enum.ts` | `DeviceType` | `None` | `npm run lint` |
| **3** | `[x]` | `[NEW]` | `src/modules/network-device/enums/scan-status.enum.ts` | `ScanStatus` | `None` | `npm run lint` |
| **4** | `[x]` | `[NEW]` | `src/modules/network-device/enums/index.ts` | Barrel exports | `Order 2, 3` | `npm run lint` |
| **5** | `[x]` | `[NEW]` | `src/modules/network-device/interfaces/network-device.interface.ts` | Explicit interfaces | `Order 2, 3` | `npm run lint` |
| **6** | `[x]` | `[NEW]` | `src/modules/network-device/interfaces/probe-service.interface.ts` | `IProbeService` | `Order 5` | `npm run lint` |
| **7** | `[x]` | `[NEW]` | `src/modules/network-device/interfaces/index.ts` | Barrel exports | `Order 5, 6` | `npm run lint` |
| **8** | `[x]` | `[NEW]` | `src/modules/network-device/constants/oui-database.constant.ts` | `OUI_DATABASE` | `Order 2, 5` | `npm run lint` |
| **9** | `[x]` | `[NEW]` | `src/modules/network-device/constants/network-device-error.ts` | `NetworkDeviceError` | `None` | `npm run lint` |
| **10** | `[x]` | `[NEW]` | `src/modules/network-device/entities/network-device.entity.ts` | `NetworkDeviceEntity` | `Order 2, 5` | `npm run lint` |
| **11** | `[x]` | `[NEW]` | `src/modules/network-device/dtos/network-device.dto.ts` | `NetworkDeviceDto` | `Order 2, 5` | `npm run lint` |
| **12** | `[x]` | `[NEW]` | `src/modules/network-device/dtos/requests/trigger-scan-request.dto.ts` | `TriggerScanRequestDto` | `None` | `npm run lint` |
| **13** | `[x]` | `[NEW]` | `src/modules/network-device/dtos/responses/scan-status-response.dto.ts` | `ScanStatusResponseDto` | `Order 3, 5` | `npm run lint` |
| **14** | `[x]` | `[NEW]` | `src/modules/network-device/dtos/responses/trigger-scan-response.dto.ts` | `TriggerScanResponseDto` | `Order 3` | `npm run lint` |
| **15** | `[x]` | `[NEW]` | `src/modules/network-device/constants/network-device-pagination.config.ts` | `NETWORK_DEVICE_PAGINATION_CONFIG` | `Order 10` | `npm run lint` |
| **16** | `[x]` | `[NEW]` | `src/modules/network-device/services/oui-lookup.service.ts` | `OuiLookupService.lookupVendor` | `Order 5, 8` | `npm run lint` |
| **17** | `[x]` | `[NEW]` | `src/modules/network-device/services/onvif-probe.service.ts` | `OnvifProbeService.probe` | `Order 5, 6` | `npm run lint` |
| **18** | `[x]` | `[NEW]` | `src/modules/network-device/services/arp-scan.service.ts` | `ArpScanService.scan` | `Order 5, 6, 16` | `npm run lint` |
| **19** | `[x]` | `[NEW]` | `src/modules/network-device/services/tcp-port-probe.service.ts` | `TcpPortProbeService.probeSubnet` | `Order 5, 6` | `npm run lint` |
| **20** | `[x]` | `[NEW]` | `src/modules/network-device/services/network-device.service.ts` | `NetworkDeviceService` | `Order 10, 11` | `npm run lint` |
| **21** | `[x]` | `[NEW]` | `src/modules/network-device/services/device-aggregator.service.ts` | `DeviceAggregatorService.scanAndAggregate` | `Order 5, 16, 17, 18, 19, 20` | `npm run lint` |
| **22** | `[x]` | `[NEW]` | `src/modules/network-device/controllers/network-device.controller.ts` | `NetworkDeviceController` | `Order 15, 20, 21` | `npm run lint` |
| **23** | `[x]` | `[NEW]` | `src/modules/network-device/network-device.profile.ts` | `NetworkDeviceProfile` | `Order 10, 11` | `npm run lint` |
| **24** | `[x]` | `[NEW]` | `src/modules/network-device/network-device.module.ts` | `NetworkDeviceModule` | `Order 20, 21, 22, 23` | `npm run lint` |
| **25** | `[x]` | `[NEW]` | `src/modules/websocket/services/network-device.socket.service.ts` | `NetworkDeviceSocketService` | `Order 1, 5` | `npm run lint` |
| **26** | `[x]` | `[MODIFY]` | `src/modules/websocket/websocket.module.ts` | `WebsocketModule` providers | `Order 25` | `npm run lint` |
| **27** | `[x]` | `[MODIFY]` | `src/app.module.ts` | `AppModule` imports | `Order 24` | `npm run build` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/websocket/enums/subscribe-name.enum.ts`
> **Action**: Bổ sung các event identifiers cho Network Device Discovery vào `SubscribeName` và `WebSocketEvent`.

```diff
@@ -29,6 +29,11 @@
     // Notification Events
     NEW_NOTIFICATION = 'newNotification',
+
+    // Network Device Discovery Events
+    DEVICE_DISCOVERED = 'deviceDiscovered',
+    DEVICE_SCAN_STARTED = 'deviceScanStarted',
+    DEVICE_SCAN_COMPLETED = 'deviceScanCompleted',
 }
 
 export enum WebSocketEvent {
@@ -68,4 +73,9 @@
     NOTIFICATION_CREATED = 'notification.created',
     NOTIFICATION_UPDATED = 'notification.updated',
     NOTIFICATION_DELETED = 'notification.deleted',
+
+    // Network Device Events
+    DEVICE_DISCOVERED = 'device.discovered',
+    DEVICE_SCAN_STARTED = 'device.scan.started',
+    DEVICE_SCAN_COMPLETED = 'device.scan.completed',
 }
```

---

### 2. `[NEW]` `src/modules/network-device/enums/device-type.enum.ts`
> **Action**: Khởi tạo Enum `DeviceType` định danh các chủng loại thiết bị.

```typescript
export enum DeviceType {
    CAMERA = 'CAMERA',
    ROUTER_AP = 'ROUTER_AP',
    COMPUTER_PHONE = 'COMPUTER_PHONE',
    SMART_IOT = 'SMART_IOT',
    PRINTER = 'PRINTER',
    UNKNOWN = 'UNKNOWN',
}
```

---

### 3. `[NEW]` `src/modules/network-device/enums/scan-status.enum.ts`
> **Action**: Khởi tạo Enum `ScanStatus` theo dõi trạng thái tiến trình quét mạng.

```typescript
export enum ScanStatus {
    IDLE = 'IDLE',
    SCANNING = 'SCANNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}
```

---

### 4. `[NEW]` `src/modules/network-device/enums/index.ts`
> **Action**: Xuất khẩu các enum trong module `network-device`.

```typescript
export * from './device-type.enum';
export * from './scan-status.enum';
```

---

### 5. `[NEW]` `src/modules/network-device/interfaces/network-device.interface.ts`
> **Action**: Định nghĩa toàn bộ các Explicit Interfaces phục vụ giao tiếp giữa các services, không sử dụng anonymous inline object types.

```typescript
import { DeviceType } from '../enums/device-type.enum';
import { ScanStatus } from '../enums/scan-status.enum';

export interface IOnvifMetadata {
    xAddrs?: string[];
    types?: string;
    scopes?: string[];
    rawXml?: string;
}

export interface IDiscoveredDevice {
    ipAddress: string;
    macAddress?: string;
    vendor?: string;
    model?: string;
    firmwareVersion?: string;
    deviceType: DeviceType;
    openPorts: number[];
    onvifMetadata?: IOnvifMetadata;
    isOnline: boolean;
    lastSeenAt: Date;
}

export interface IOuiEntry {
    vendor: string;
    defaultType?: DeviceType;
}

export interface IOuiLookupResult {
    vendor?: string;
    defaultType?: DeviceType;
}

export interface IArpEntry {
    ip: string;
    mac: string;
}

export interface IScanStatusData {
    status: ScanStatus;
    startedAt?: string | null;
    completedAt?: string | null;
    devicesDiscoveredCount: number;
}

export interface IDeviceDiscoveredEventPayload {
    device: IDiscoveredDevice;
}

export interface IScanStartedEventPayload {
    status: ScanStatus;
    startedAt: string;
}

export interface IScanCompletedEventPayload {
    status: ScanStatus;
    totalDiscovered: number;
    completedAt: string;
}
```

---

### 6. `[NEW]` `src/modules/network-device/interfaces/probe-service.interface.ts`
> **Action**: Định nghĩa interface `IProbeService` chuẩn hóa các service thăm dò mạng.

```typescript
import { IDiscoveredDevice } from './network-device.interface';

export interface IProbeService {
    probe(subnet?: string): Promise<IDiscoveredDevice[]>;
}
```

---

### 7. `[NEW]` `src/modules/network-device/interfaces/index.ts`
> **Action**: Barrel export toàn bộ interface của module `network-device`.

```typescript
export * from './network-device.interface';
export * from './probe-service.interface';
```

---

### 8. `[NEW]` `src/modules/network-device/constants/oui-database.constant.ts`
> **Action**: Từ điển tra cứu OUI offline chứa các dải MAC prefix với kiểu `Record<string, IOuiEntry>`.

```typescript
import { DeviceType } from '../enums/device-type.enum';
import { IOuiEntry } from '../interfaces/network-device.interface';

export const OUI_DATABASE: Record<string, IOuiEntry> = {
    // Hikvision & EZVIZ
    'C0:56:E3': { vendor: 'Hikvision', defaultType: DeviceType.CAMERA },
    '44:19:B6': { vendor: 'Hikvision', defaultType: DeviceType.CAMERA },
    'BC:5E:CD': { vendor: 'Hikvision', defaultType: DeviceType.CAMERA },
    '80:E0:1D': { vendor: 'Hikvision', defaultType: DeviceType.CAMERA },
    '28:57:BE': { vendor: 'Hikvision', defaultType: DeviceType.CAMERA },
    '58:03:FB': { vendor: 'EZVIZ', defaultType: DeviceType.CAMERA },
    '18:68:CB': { vendor: 'EZVIZ', defaultType: DeviceType.CAMERA },

    // Dahua & IMOU
    '3C:EF:8C': { vendor: 'Dahua', defaultType: DeviceType.CAMERA },
    '4C:11:BF': { vendor: 'Dahua', defaultType: DeviceType.CAMERA },
    'E0:50:8B': { vendor: 'Dahua', defaultType: DeviceType.CAMERA },
    '90:02:A9': { vendor: 'Dahua', defaultType: DeviceType.CAMERA },
    'B0:C5:54': { vendor: 'IMOU', defaultType: DeviceType.CAMERA },
    'A4:DA:32': { vendor: 'IMOU', defaultType: DeviceType.CAMERA },

    // TP-Link / Tapo / Kasa
    '50:C7:BF': { vendor: 'TP-Link', defaultType: DeviceType.ROUTER_AP },
    '70:4F:57': { vendor: 'TP-Link', defaultType: DeviceType.ROUTER_AP },
    'E8:48:B8': { vendor: 'TP-Link', defaultType: DeviceType.ROUTER_AP },
    '98:48:27': { vendor: 'TP-Link Tapo', defaultType: DeviceType.CAMERA },

    // Reolink, Uniview, Hanwha
    'EC:71:DB': { vendor: 'Reolink', defaultType: DeviceType.CAMERA },
    '00:1A:11': { vendor: 'Google / Nest', defaultType: DeviceType.SMART_IOT },
    '48:EA:63': { vendor: 'Uniview', defaultType: DeviceType.CAMERA },
    '00:09:18': { vendor: 'Hanwha Techwin', defaultType: DeviceType.CAMERA },

    // Network Routers & Gateways
    '00:1A:2B': { vendor: 'Cisco', defaultType: DeviceType.ROUTER_AP },
    'B4:FB:E4': { vendor: 'Ubiquiti', defaultType: DeviceType.ROUTER_AP },
    '74:83:C2': { vendor: 'Ubiquiti', defaultType: DeviceType.ROUTER_AP },
    '48:8F:5A': { vendor: 'MikroTik', defaultType: DeviceType.ROUTER_AP },
    '00:0C:42': { vendor: 'MikroTik', defaultType: DeviceType.ROUTER_AP },
    'D8:07:B6': { vendor: 'ASUS', defaultType: DeviceType.ROUTER_AP },

    // Computers / Mobile / IoT Chips
    'F0:18:98': { vendor: 'Apple', defaultType: DeviceType.COMPUTER_PHONE },
    '3C:06:30': { vendor: 'Apple', defaultType: DeviceType.COMPUTER_PHONE },
    'AC:BC:32': { vendor: 'Apple', defaultType: DeviceType.COMPUTER_PHONE },
    '24:4B:FE': { vendor: 'Espressif (ESP32/ESP8266)', defaultType: DeviceType.SMART_IOT },
    '30:AE:A4': { vendor: 'Espressif', defaultType: DeviceType.SMART_IOT },
    '84:F3:EB': { vendor: 'Xiaomi', defaultType: DeviceType.SMART_IOT },
    '50:82:D5': { vendor: 'Xiaomi', defaultType: DeviceType.SMART_IOT },
    '00:1E:68': { vendor: 'Raspberry Pi', defaultType: DeviceType.COMPUTER_PHONE },
    'DC:A6:32': { vendor: 'Raspberry Pi', defaultType: DeviceType.COMPUTER_PHONE },
};
```

---

### 9. `[NEW]` `src/modules/network-device/constants/network-device-error.ts`
> **Action**: Khởi tạo từ điển lỗi nghiệp vụ `NetworkDeviceError` theo chuẩn `AppException`.

```typescript
import { HttpStatus } from '@nestjs/common';
import { IAppError } from '../../../constant/error-code';

export class NetworkDeviceError {
    static readonly DeviceNotFound: IAppError = {
        code: 'network_device_not_found',
        message: 'Không tìm thấy thông tin thiết bị mạng.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly ScanAlreadyInProgress: IAppError = {
        code: 'network_device_scan_in_progress',
        message: 'Tiến trình quét mạng đang được thực thi, vui lòng đợi trong giây lát.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly SubnetInvalid: IAppError = {
        code: 'network_device_subnet_invalid',
        message: 'Dải mạng (Subnet) không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };
}
```

---

### 10. `[NEW]` `src/modules/network-device/entities/network-device.entity.ts`
> **Action**: Khởi tạo Entity TypeORM `NetworkDeviceEntity` kế thừa `AbstractEntity`.

```typescript
import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { DeviceType } from '../enums/device-type.enum';
import { IOnvifMetadata } from '../interfaces/network-device.interface';

@Entity('network_devices')
export class NetworkDeviceEntity extends AbstractEntity {
    @Column({ type: 'varchar', length: 45, unique: true, name: 'ip_address' })
    @Index({ unique: true })
    @AutoMap()
    ipAddress: string;

    @Column({ type: 'varchar', length: 17, nullable: true, name: 'mac_address' })
    @Index()
    @AutoMap()
    macAddress?: string | null;

    @Column({
        type: 'enum',
        enum: DeviceType,
        default: DeviceType.UNKNOWN,
        name: 'device_type',
    })
    @AutoMap()
    deviceType: DeviceType;

    @Column({ type: 'varchar', length: 100, nullable: true })
    @AutoMap()
    vendor?: string | null;

    @Column({ type: 'varchar', length: 150, nullable: true })
    @AutoMap()
    model?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'firmware_version' })
    @AutoMap()
    firmwareVersion?: string | null;

    @Column({ type: 'jsonb', default: [], name: 'open_ports' })
    @AutoMap()
    openPorts: number[];

    @Column({ type: 'jsonb', nullable: true, name: 'onvif_metadata' })
    @AutoMap()
    onvifMetadata?: IOnvifMetadata | null;

    @Column({ type: 'boolean', default: true, name: 'is_online' })
    @AutoMap()
    isOnline: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', name: 'last_seen_at' })
    @AutoMap()
    lastSeenAt: Date;
}
```

---

### 11. `[NEW]` `src/modules/network-device/dtos/network-device.dto.ts`
> **Action**: Khởi tạo DTO `NetworkDeviceDto` dùng cho phản hồi danh sách và chi tiết thiết bị.

```typescript
import { AutoMap } from '@automapper/classes';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { BooleanField, EnumField, NumberField, StringField, StringFieldOptional } from '../../../decorators';
import { DeviceType } from '../enums/device-type.enum';
import { IOnvifMetadata } from '../interfaces/network-device.interface';

export class NetworkDeviceDto extends AbstractDto {
    @StringField()
    @AutoMap()
    ipAddress: string;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    macAddress?: string | null;

    @EnumField(() => DeviceType)
    @AutoMap()
    deviceType: DeviceType;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    vendor?: string | null;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    model?: string | null;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    firmwareVersion?: string | null;

    @NumberField({ each: true })
    @AutoMap()
    openPorts: number[];

    @AutoMap()
    onvifMetadata?: IOnvifMetadata | null;

    @BooleanField()
    @AutoMap()
    isOnline: boolean;

    @AutoMap()
    lastSeenAt: Date;
}
```

---

### 12. `[NEW]` `src/modules/network-device/dtos/requests/trigger-scan-request.dto.ts`
> **Action**: DTO nhận request kích hoạt quét mạng (tùy chọn custom subnet hoặc timeout).

```typescript
import { NumberFieldOptional, StringFieldOptional } from '../../../../decorators';

export class TriggerScanRequestDto {
    @StringFieldOptional({
        description: 'Dải mạng subnet cần quét (VD: 192.168.1). Nếu để trống sẽ tự động phát hiện IP card mạng.',
    })
    subnet?: string;

    @NumberFieldOptional({
        description: 'Thời gian chờ phản hồi UDP probe tính bằng ms (Mặc định: 3000ms)',
        min: 1000,
        max: 10000,
    })
    probeTimeoutMs?: number;
}
```

---

### 13. `[NEW]` `src/modules/network-device/dtos/responses/scan-status-response.dto.ts`
> **Action**: DTO phản hồi trạng thái của tiến trình scan.

```typescript
import { EnumField, NumberFieldOptional, StringFieldOptional } from '../../../../decorators';
import { ScanStatus } from '../../enums/scan-status.enum';
import { IScanStatusData } from '../../interfaces/network-device.interface';

export class ScanStatusResponseDto implements IScanStatusData {
    @EnumField(() => ScanStatus)
    status: ScanStatus;

    @NumberFieldOptional()
    devicesDiscoveredCount: number;

    @StringFieldOptional({ nullable: true })
    startedAt?: string | null;

    @StringFieldOptional({ nullable: true })
    completedAt?: string | null;
}
```

---

### 14. `[NEW]` `src/modules/network-device/dtos/responses/trigger-scan-response.dto.ts`
> **Action**: DTO phản hồi khi client kích hoạt lệnh quét mạng.

```typescript
import { EnumField, StringField } from '../../../../decorators';
import { ScanStatus } from '../../enums/scan-status.enum';

export class TriggerScanResponseDto {
    @StringField()
    message: string;

    @EnumField(() => ScanStatus)
    status: ScanStatus;

    @StringField()
    startedAt: string;
}
```

---

### 15. `[NEW]` `src/modules/network-device/constants/network-device-pagination.config.ts`
> **Action**: Khởi tạo `PaginateConfig` chuẩn cho `NetworkDeviceEntity` hỗ trợ search đa cột và filter theo `deviceType`.

```typescript
import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { NetworkDeviceEntity } from '../entities/network-device.entity';

const networkDeviceColumns = getColumnNames(NetworkDeviceEntity);

export const NETWORK_DEVICE_PAGINATION_CONFIG = createPaginationConfig<NetworkDeviceEntity>({
    sortableColumns: ['ipAddress', 'macAddress', 'vendor', 'deviceType', 'lastSeenAt', 'createdAt'],
    searchableColumns: ['ipAddress', 'macAddress', 'vendor', 'model'],
    defaultSortBy: [['lastSeenAt', 'DESC']],
    filterableColumns: {
        deviceType: [FilterOperator.EQ, FilterOperator.IN],
        isOnline: [FilterOperator.EQ],
        vendor: [FilterOperator.ILIKE, FilterOperator.EQ],
        ipAddress: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    select: [...networkDeviceColumns],
    maxLimit: 100,
    defaultLimit: 20,
});
```

---

### 16. `[NEW]` `src/modules/network-device/services/oui-lookup.service.ts`
> **Action**: Service tra cứu vendor và gợi ý `DeviceType` từ địa chỉ MAC dựa trên từ điển `OUI_DATABASE`, trả về `IOuiLookupResult`.

```typescript
import { Injectable } from '@nestjs/common';
import { OUI_DATABASE } from '../constants/oui-database.constant';
import { IOuiLookupResult } from '../interfaces/network-device.interface';

@Injectable()
export class OuiLookupService {
    lookupVendor(macAddress?: string | null): IOuiLookupResult {
        if (!macAddress) return {};

        const normalized = macAddress.toUpperCase().replace(/[:-]/g, '');
        if (normalized.length < 6) return {};

        const prefix = `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}:${normalized.slice(4, 6)}`;
        const match = OUI_DATABASE[prefix];

        if (match) {
            return {
                vendor: match.vendor,
                defaultType: match.defaultType,
            };
        }

        return {};
    }
}
```

---

### 17. `[NEW]` `src/modules/network-device/services/onvif-probe.service.ts`
> **Action**: Quản lý UDP Socket Multicast (`dgram`) gửi gói tin SOAP WS-Discovery và trích xuất thông tin Camera ONVIF.

```typescript
import * as crypto from 'node:crypto';
import * as dgram from 'node:dgram';
import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import { DeviceType } from '../enums/device-type.enum';
import { IDiscoveredDevice, IOnvifMetadata } from '../interfaces/network-device.interface';
import { IProbeService } from '../interfaces/probe-service.interface';

const ONVIF_MULTICAST_IP = '239.255.255.250';
const ONVIF_MULTICAST_PORT = 3702;

@Injectable()
export class OnvifProbeService implements IProbeService {
    private readonly logger = new LoggerService(OnvifProbeService.name);

    async probe(subnet?: string, timeoutMs = 3000): Promise<IDiscoveredDevice[]> {
        return new Promise((resolve) => {
            const discoveredMap = new Map<string, IDiscoveredDevice>();
            const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            const probeMessage = `<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <Header>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">uuid:${crypto.randomUUID()}</wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </Header>
  <Body>
    <dn:Probe><dn:Types>dn:NetworkVideoTransmitter</dn:Types></dn:Probe>
  </Body>
</Envelope>`;

            let timer: NodeJS.Timeout;

            const cleanup = () => {
                try {
                    clearTimeout(timer);
                    client.close();
                } catch {
                    // Ignore socket close exceptions
                }
                resolve(Array.from(discoveredMap.values()));
            };

            client.on('error', (err) => {
                this.logger.error(`ONVIF Probe UDP socket error: ${err.message}`);
                cleanup();
            });

            client.on('message', (msg, rinfo) => {
                try {
                    const rawXml = msg.toString('utf8');
                    const ip = rinfo.address;

                    const metadata = this.parseOnvifXml(rawXml);
                    const openPorts: number[] = [rinfo.port];
                    if (metadata.xAddrs) {
                        for (const xAddr of metadata.xAddrs) {
                            try {
                                const url = new URL(xAddr);
                                const port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
                                if (!openPorts.includes(port)) openPorts.push(port);
                            } catch {
                                // Ignore invalid URL
                            }
                        }
                    }

                    const device: IDiscoveredDevice = {
                        ipAddress: ip,
                        deviceType: DeviceType.CAMERA,
                        vendor: this.extractVendorFromScopes(metadata.scopes),
                        model: this.extractModelFromScopes(metadata.scopes),
                        openPorts,
                        onvifMetadata: metadata,
                        isOnline: true,
                        lastSeenAt: new Date(),
                    };

                    discoveredMap.set(ip, device);
                    this.logger.log(`ONVIF Camera discovered: ${ip} (${device.vendor || 'Unknown Vendor'})`);
                } catch (err) {
                    this.logger.error(`Failed to parse ONVIF message from ${rinfo.address}: ${err.message}`);
                }
            });

            client.bind(0, () => {
                try {
                    client.setBroadcast(true);
                    client.setMulticastTTL(128);
                    const buffer = Buffer.from(probeMessage, 'utf8');
                    client.send(buffer, 0, buffer.length, ONVIF_MULTICAST_PORT, ONVIF_MULTICAST_IP, (err) => {
                        if (err) {
                            this.logger.error(`Failed to send ONVIF probe packet: ${err.message}`);
                            cleanup();
                        }
                    });
                } catch (e) {
                    this.logger.error(`Error configuring UDP socket: ${e.message}`);
                    cleanup();
                }
            });

            timer = setTimeout(cleanup, timeoutMs);
        });
    }

    private parseOnvifXml(xml: string): IOnvifMetadata {
        const metadata: IOnvifMetadata = { rawXml: xml };

        const xAddrsMatch = xml.match(/<[^:]*:?XAddrs[^>]*>([^<]+)<\/[^:]*:?XAddrs>/i);
        if (xAddrsMatch) {
            metadata.xAddrs = xAddrsMatch[1].trim().split(/\s+/);
        }

        const typesMatch = xml.match(/<[^:]*:?Types[^>]*>([^<]+)<\/[^:]*:?Types>/i);
        if (typesMatch) {
            metadata.types = typesMatch[1].trim();
        }

        const scopesMatch = xml.match(/<[^:]*:?Scopes[^>]*>([^<]+)<\/[^:]*:?Scopes>/i);
        if (scopesMatch) {
            metadata.scopes = scopesMatch[1].trim().split(/\s+/);
        }

        return metadata;
    }

    private extractVendorFromScopes(scopes?: string[]): string | undefined {
        if (!scopes) return undefined;
        for (const scope of scopes) {
            const match = scope.match(/onvif:\/\/www\.onvif\.org\/name\/([^\/\s]+)/i) || scope.match(/onvif:\/\/www\.onvif\.org\/hardware\/([^\/\s]+)/i);
            if (match) return decodeURIComponent(match[1]);
        }
        return undefined;
    }

    private extractModelFromScopes(scopes?: string[]): string | undefined {
        if (!scopes) return undefined;
        for (const scope of scopes) {
            const match = scope.match(/onvif:\/\/www\.onvif\.org\/model\/([^\/\s]+)/i);
            if (match) return decodeURIComponent(match[1]);
        }
        return undefined;
    }
}
```

---

### 18. `[NEW]` `src/modules/network-device/services/arp-scan.service.ts`
> **Action**: Quét bảng ARP hệ thống (hỗ trợ macOS và Linux), chuẩn hóa địa chỉ MAC qua `IArpEntry` và liên kết với `OuiLookupService`.

```typescript
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import { DeviceType } from '../enums/device-type.enum';
import { IArpEntry, IDiscoveredDevice } from '../interfaces/network-device.interface';
import { IProbeService } from '../interfaces/probe-service.interface';
import { OuiLookupService } from './oui-lookup.service';

const execAsync = promisify(exec);

@Injectable()
export class ArpScanService implements IProbeService {
    private readonly logger = new LoggerService(ArpScanService.name);

    constructor(private readonly ouiLookupService: OuiLookupService) {}

    async scan(): Promise<IDiscoveredDevice[]> {
        return this.probe();
    }

    async probe(): Promise<IDiscoveredDevice[]> {
        const devices: IDiscoveredDevice[] = [];

        try {
            const { stdout } = await execAsync('arp -a');
            const lines = stdout.split('\n');

            for (const line of lines) {
                const parsed = this.parseArpLine(line);
                if (parsed) {
                    const { vendor, defaultType } = this.ouiLookupService.lookupVendor(parsed.mac);
                    devices.push({
                        ipAddress: parsed.ip,
                        macAddress: parsed.mac,
                        vendor: vendor || undefined,
                        deviceType: defaultType || DeviceType.UNKNOWN,
                        openPorts: [],
                        isOnline: true,
                        lastSeenAt: new Date(),
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Error reading ARP table: ${error.message}`);
        }

        return devices;
    }

    private parseArpLine(line: string): IArpEntry | null {
        // macOS format: ? (192.168.1.1) at 34:2c:c4:12:34:56 on en0 ifscope [ethernet]
        // Linux format: ? (192.168.1.1) at 34:2c:c4:12:34:56 [ether] on eth0
        const ipMatch = line.match(/\((([0-9]{1,3}\.){3}[0-9]{1,3})\)/);
        const macMatch = line.match(/([0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2})/);

        if (ipMatch && macMatch && !macMatch[1].toLowerCase().includes('ff:ff:ff:ff:ff:ff')) {
            const normalizedMac = macMatch[1]
                .split(/[:-]/)
                .map((part) => part.padStart(2, '0').toUpperCase())
                .join(':');

            return {
                ip: ipMatch[1],
                mac: normalizedMac,
            };
        }

        return null;
    }
}
```

---

### 19. `[NEW]` `src/modules/network-device/services/tcp-port-probe.service.ts`
> **Action**: Quét nhanh các cổng đặc trưng (`554`, `8000`, `37777`, `80`, `443`, `9100`) trên dải subnet với batch concurrency limit.

```typescript
import * as net from 'node:net';
import * as os from 'node:os';
import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import { DeviceType } from '../enums/device-type.enum';
import { IDiscoveredDevice } from '../interfaces/network-device.interface';
import { IProbeService } from '../interfaces/probe-service.interface';

const TARGET_PORTS = [554, 8000, 37777, 80, 443, 8080, 9100];
const BATCH_SIZE = 30;
const SOCKET_TIMEOUT_MS = 400;

@Injectable()
export class TcpPortProbeService implements IProbeService {
    private readonly logger = new LoggerService(TcpPortProbeService.name);

    async probe(subnet?: string): Promise<IDiscoveredDevice[]> {
        return this.probeSubnet(subnet);
    }

    async probeSubnet(customSubnet?: string): Promise<IDiscoveredDevice[]> {
        const subnet = customSubnet || this.detectLocalSubnet();
        if (!subnet) {
            this.logger.warn('No active IPv4 subnet detected for TCP probe');
            return [];
        }

        const ipList: string[] = [];
        for (let i = 1; i <= 254; i++) {
            ipList.push(`${subnet}.${i}`);
        }

        const discoveredDevices: IDiscoveredDevice[] = [];

        for (let i = 0; i < ipList.length; i += BATCH_SIZE) {
            const batch = ipList.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(batch.map((ip) => this.probeIp(ip)));

            for (const result of batchResults) {
                if (result) discoveredDevices.push(result);
            }
        }

        return discoveredDevices;
    }

    private async probeIp(ip: string): Promise<IDiscoveredDevice | null> {
        const openPorts: number[] = [];

        await Promise.all(
            TARGET_PORTS.map(async (port) => {
                const isOpen = await this.checkPort(ip, port);
                if (isOpen) openPorts.push(port);
            }),
        );

        if (openPorts.length === 0) return null;

        let deviceType = DeviceType.UNKNOWN;
        if (openPorts.includes(554) || openPorts.includes(8000) || openPorts.includes(37777)) {
            deviceType = DeviceType.CAMERA;
        } else if (openPorts.includes(9100)) {
            deviceType = DeviceType.PRINTER;
        } else if (openPorts.includes(80) || openPorts.includes(443) || openPorts.includes(8080)) {
            deviceType = DeviceType.ROUTER_AP;
        }

        return {
            ipAddress: ip,
            deviceType,
            openPorts,
            isOnline: true,
            lastSeenAt: new Date(),
        };
    }

    private checkPort(host: string, port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let isResolved = false;

            const onDone = (status: boolean) => {
                if (!isResolved) {
                    isResolved = true;
                    socket.destroy();
                    resolve(status);
                }
            };

            socket.setTimeout(SOCKET_TIMEOUT_MS);
            socket.once('connect', () => onDone(true));
            socket.once('timeout', () => onDone(false));
            socket.once('error', () => onDone(false));

            try {
                socket.connect(port, host);
            } catch {
                onDone(false);
            }
        });
    }

    private detectLocalSubnet(): string | null {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const ifaceList = interfaces[name];
            if (!ifaceList) continue;

            for (const iface of ifaceList) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const parts = iface.address.split('.');
                    if (parts.length === 4) {
                        return `${parts[0]}.${parts[1]}.${parts[2]}`;
                    }
                }
            }
        }
        return null;
    }
}
```

---

### 20. `[NEW]` `src/modules/network-device/services/network-device.service.ts`
> **Action**: Service nghiệp vụ CRUD cho thiết bị mạng, kế thừa `BaseService`.

```typescript
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { NetworkDeviceDto } from '../dtos/network-device.dto';
import { NetworkDeviceEntity } from '../entities/network-device.entity';
import { DeviceType } from '../enums/device-type.enum';
import { IDiscoveredDevice } from '../interfaces/network-device.interface';

@Injectable()
export class NetworkDeviceService extends BaseService<NetworkDeviceEntity, NetworkDeviceDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(NetworkDeviceEntity)
        private readonly networkDeviceRepo: Repository<NetworkDeviceEntity>,
    ) {
        super(networkDeviceRepo, mapper, NetworkDeviceDto, NetworkDeviceService.name);
    }

    async upsertDevice(data: IDiscoveredDevice): Promise<NetworkDeviceEntity> {
        let existing = await this.networkDeviceRepo.findOne({
            where: { ipAddress: data.ipAddress },
        });

        if (!existing && data.macAddress) {
            existing = await this.networkDeviceRepo.findOne({
                where: { macAddress: data.macAddress },
            });
        }

        if (existing) {
            existing.ipAddress = data.ipAddress;
            if (data.macAddress) existing.macAddress = data.macAddress;
            if (data.vendor) existing.vendor = data.vendor;
            if (data.model) existing.model = data.model;
            if (data.firmwareVersion) existing.firmwareVersion = data.firmwareVersion;
            if (data.onvifMetadata) existing.onvifMetadata = data.onvifMetadata;

            const mergedPorts = Array.from(new Set([...(existing.openPorts || []), ...data.openPorts]));
            existing.openPorts = mergedPorts;

            if (data.deviceType && data.deviceType !== DeviceType.UNKNOWN) {
                existing.deviceType = data.deviceType;
            }

            existing.isOnline = true;
            existing.lastSeenAt = new Date();

            return await this.networkDeviceRepo.save(existing);
        }

        const newDevice = this.networkDeviceRepo.create({
            ipAddress: data.ipAddress,
            macAddress: data.macAddress || null,
            vendor: data.vendor || null,
            model: data.model || null,
            firmwareVersion: data.firmwareVersion || null,
            deviceType: data.deviceType,
            openPorts: data.openPorts || [],
            onvifMetadata: data.onvifMetadata || null,
            isOnline: true,
            lastSeenAt: new Date(),
        });

        return await this.networkDeviceRepo.save(newDevice);
    }
}
```

---

### 21. `[NEW]` `src/modules/network-device/services/device-aggregator.service.ts`
> **Action**: Điều phối 3 probe (ONVIF, ARP, TCP), tổng hợp kết quả, lưu DB và bắn event realtime qua `EventEmitter2` với payload interfaces tường minh.

```typescript
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { WebSocketEvent } from '../../websocket/enums/subscribe-name.enum';
import { DeviceType } from '../enums/device-type.enum';
import { ScanStatus } from '../enums/scan-status.enum';
import {
    IDeviceDiscoveredEventPayload,
    IDiscoveredDevice,
    IScanCompletedEventPayload,
    IScanStartedEventPayload,
    IScanStatusData,
} from '../interfaces/network-device.interface';
import { ArpScanService } from './arp-scan.service';
import { NetworkDeviceService } from './network-device.service';
import { OnvifProbeService } from './onvif-probe.service';
import { TcpPortProbeService } from './tcp-port-probe.service';

@Injectable()
export class DeviceAggregatorService {
    private readonly logger = new LoggerService(DeviceAggregatorService.name);
    private scanStatus: ScanStatus = ScanStatus.IDLE;
    private startedAt: Date | null = null;
    private completedAt: Date | null = null;
    private discoveredCount = 0;

    constructor(
        private readonly onvifProbeService: OnvifProbeService,
        private readonly arpScanService: ArpScanService,
        private readonly tcpPortProbeService: TcpPortProbeService,
        private readonly networkDeviceService: NetworkDeviceService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    getScanStatus(): IScanStatusData {
        return {
            status: this.scanStatus,
            startedAt: this.startedAt?.toISOString() || null,
            completedAt: this.completedAt?.toISOString() || null,
            devicesDiscoveredCount: this.discoveredCount,
        };
    }

    async scanAndAggregate(subnet?: string, probeTimeoutMs = 3000): Promise<void> {
        if (this.scanStatus === ScanStatus.SCANNING) {
            this.logger.warn('Scan is already in progress, ignoring duplicate trigger');
            return;
        }

        this.scanStatus = ScanStatus.SCANNING;
        this.startedAt = new Date();
        this.completedAt = null;
        this.discoveredCount = 0;

        const startPayload: IScanStartedEventPayload = {
            status: ScanStatus.SCANNING,
            startedAt: this.startedAt.toISOString(),
        };
        this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_STARTED, startPayload);

        try {
            this.logger.log('Starting parallel Network Probing Pipeline (ONVIF, ARP, TCP)...');

            const [onvifDevices, arpDevices, tcpDevices] = await Promise.all([
                this.onvifProbeService.probe(subnet, probeTimeoutMs),
                this.arpScanService.scan(),
                this.tcpPortProbeService.probeSubnet(subnet),
            ]);

            const mergedMap = new Map<string, IDiscoveredDevice>();

            const mergeDevice = (item: IDiscoveredDevice) => {
                const existing = mergedMap.get(item.ipAddress);
                if (!existing) {
                    mergedMap.set(item.ipAddress, { ...item });
                } else {
                    if (item.macAddress) existing.macAddress = item.macAddress;
                    if (item.vendor) existing.vendor = item.vendor;
                    if (item.model) existing.model = item.model;
                    if (item.firmwareVersion) existing.firmwareVersion = item.firmwareVersion;
                    if (item.onvifMetadata) existing.onvifMetadata = item.onvifMetadata;

                    const ports = Array.from(new Set([...existing.openPorts, ...item.openPorts]));
                    existing.openPorts = ports;

                    if (item.deviceType === DeviceType.CAMERA || existing.deviceType === DeviceType.UNKNOWN) {
                        existing.deviceType = item.deviceType;
                    }
                }
            };

            // Ưu tiên thứ tự hợp nhất: ONVIF (chính xác nhất) -> ARP -> TCP Port
            onvifDevices.forEach(mergeDevice);
            arpDevices.forEach(mergeDevice);
            tcpDevices.forEach(mergeDevice);

            for (const device of mergedMap.values()) {
                const savedEntity = await this.networkDeviceService.upsertDevice(device);
                this.discoveredCount++;

                const discoveredPayload: IDeviceDiscoveredEventPayload = {
                    device: {
                        ipAddress: savedEntity.ipAddress,
                        macAddress: savedEntity.macAddress || undefined,
                        vendor: savedEntity.vendor || undefined,
                        model: savedEntity.model || undefined,
                        firmwareVersion: savedEntity.firmwareVersion || undefined,
                        deviceType: savedEntity.deviceType,
                        openPorts: savedEntity.openPorts,
                        onvifMetadata: savedEntity.onvifMetadata || undefined,
                        isOnline: savedEntity.isOnline,
                        lastSeenAt: savedEntity.lastSeenAt,
                    },
                };

                this.eventEmitter.emit(WebSocketEvent.DEVICE_DISCOVERED, discoveredPayload);
            }

            this.scanStatus = ScanStatus.COMPLETED;
            this.completedAt = new Date();

            this.logger.log(`Network scan completed. Discovered ${this.discoveredCount} devices.`);

            const completedPayload: IScanCompletedEventPayload = {
                status: ScanStatus.COMPLETED,
                totalDiscovered: this.discoveredCount,
                completedAt: this.completedAt.toISOString(),
            };
            this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_COMPLETED, completedPayload);
        } catch (error) {
            this.scanStatus = ScanStatus.FAILED;
            this.logger.error(`Error during network scan: ${error.message}`);
        }
    }
}
```

---

### 22. `[NEW]` `src/modules/network-device/controllers/network-device.controller.ts`
> **Action**: Controller cung cấp REST endpoints liệt kê, tìm kiếm thiết bị, và kích hoạt quét mạng.

```typescript
import { Body, Controller, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, Get, Post } from '../../../decorators';
import { NETWORK_DEVICE_PAGINATION_CONFIG } from '../constants/network-device-pagination.config';
import { NetworkDeviceDto } from '../dtos/network-device.dto';
import { TriggerScanRequestDto } from '../dtos/requests/trigger-scan-request.dto';
import { ScanStatusResponseDto } from '../dtos/responses/scan-status-response.dto';
import { TriggerScanResponseDto } from '../dtos/responses/trigger-scan-response.dto';
import { NetworkDeviceEntity } from '../entities/network-device.entity';
import { ScanStatus } from '../enums/scan-status.enum';
import { DeviceAggregatorService } from '../services/device-aggregator.service';
import { NetworkDeviceService } from '../services/network-device.service';

@Controller('network-devices')
@ApiTags('Network Devices')
@Auth()
export class NetworkDeviceController extends BaseController<NetworkDeviceEntity, NetworkDeviceDto> {
    constructor(
        private readonly networkDeviceService: NetworkDeviceService,
        private readonly aggregatorService: DeviceAggregatorService,
    ) {
        super(networkDeviceService, NETWORK_DEVICE_PAGINATION_CONFIG);
    }

    @Post({
        path: 'scan',
        summary: 'Trigger asynchronous network scan',
        responseDto: TriggerScanResponseDto,
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async triggerScan(@Body() dto: TriggerScanRequestDto): Promise<TriggerScanResponseDto> {
        // Chạy bất đồng bộ trong background
        this.aggregatorService.scanAndAggregate(dto.subnet, dto.probeTimeoutMs).catch(() => {});

        return {
            message: 'Tiến trình quét mạng đã được kích hoạt thành công.',
            status: ScanStatus.SCANNING,
            startedAt: new Date().toISOString(),
        };
    }

    @Get({
        path: 'scan/status',
        summary: 'Get current network scan status',
        responseDto: ScanStatusResponseDto,
    })
    async getScanStatus(): Promise<ScanStatusResponseDto> {
        const statusData = this.aggregatorService.getScanStatus();
        return {
            status: statusData.status,
            devicesDiscoveredCount: statusData.devicesDiscoveredCount,
            startedAt: statusData.startedAt,
            completedAt: statusData.completedAt,
        };
    }
}
```

---

### 23. `[NEW]` `src/modules/network-device/network-device.profile.ts`
> **Action**: AutoMapper Profile ánh xạ giữa `NetworkDeviceEntity` và `NetworkDeviceDto`.

```typescript
import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { NetworkDeviceDto } from './dtos/network-device.dto';
import { NetworkDeviceEntity } from './entities/network-device.entity';

@Injectable()
export class NetworkDeviceProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, NetworkDeviceEntity, NetworkDeviceDto);
        };
    }
}
```

---

### 24. `[NEW]` `src/modules/network-device/network-device.module.ts`
> **Action**: Khởi tạo `NetworkDeviceModule` gom toàn bộ service, entity, controller và mapper profile.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NetworkDeviceController } from './controllers/network-device.controller';
import { NetworkDeviceEntity } from './entities/network-device.entity';
import { NetworkDeviceProfile } from './network-device.profile';
import { ArpScanService } from './services/arp-scan.service';
import { DeviceAggregatorService } from './services/device-aggregator.service';
import { NetworkDeviceService } from './services/network-device.service';
import { OnvifProbeService } from './services/onvif-probe.service';
import { OuiLookupService } from './services/oui-lookup.service';
import { TcpPortProbeService } from './services/tcp-port-probe.service';

@Module({
    imports: [TypeOrmModule.forFeature([NetworkDeviceEntity])],
    controllers: [NetworkDeviceController],
    providers: [
        NetworkDeviceService,
        OuiLookupService,
        OnvifProbeService,
        ArpScanService,
        TcpPortProbeService,
        DeviceAggregatorService,
        NetworkDeviceProfile,
    ],
    exports: [NetworkDeviceService, DeviceAggregatorService],
})
export class NetworkDeviceModule {}
```

---

### 25. `[NEW]` `src/modules/websocket/services/network-device.socket.service.ts`
> **Action**: Listener nhận event từ `EventEmitter2` với payload interfaces định kiểu rõ ràng và broadcast tới client qua `WebsocketGateway`.

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import {
    IDeviceDiscoveredEventPayload,
    IScanCompletedEventPayload,
    IScanStartedEventPayload,
} from '../../network-device/interfaces/network-device.interface';
import { SubscribeName, WebSocketEvent } from '../enums/subscribe-name.enum';
import { WebsocketGateway } from '../gateways/websocket.gateway';

@Injectable()
export class NetworkDeviceSocketService {
    private readonly logger: LoggerService = new LoggerService(NetworkDeviceSocketService.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    @OnEvent(WebSocketEvent.DEVICE_DISCOVERED)
    handleDeviceDiscovered(payload: IDeviceDiscoveredEventPayload): void {
        try {
            this.logger.debug(`Broadcasting device discovered event: ${payload.device?.ipAddress}`);
            this.gateway.broadcastToAll(SubscribeName.DEVICE_DISCOVERED, payload);
        } catch (error) {
            this.logger.error(`Error emitting device discovered: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.DEVICE_SCAN_STARTED)
    handleScanStarted(payload: IScanStartedEventPayload): void {
        try {
            this.logger.log('Broadcasting device scan started event');
            this.gateway.broadcastToAll(SubscribeName.DEVICE_SCAN_STARTED, payload);
        } catch (error) {
            this.logger.error(`Error emitting scan started: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.DEVICE_SCAN_COMPLETED)
    handleScanCompleted(payload: IScanCompletedEventPayload): void {
        try {
            this.logger.log(`Broadcasting device scan completed event: ${payload.totalDiscovered} found`);
            this.gateway.broadcastToAll(SubscribeName.DEVICE_SCAN_COMPLETED, payload);
        } catch (error) {
            this.logger.error(`Error emitting scan completed: ${error.message}`);
        }
    }
}
```

---

### 26. `[MODIFY]` `src/modules/websocket/websocket.module.ts`
> **Action**: Đăng ký `NetworkDeviceSocketService` vào `WebsocketModule`.

```diff
@@ -6,5 +6,6 @@
 import { JobSocketService } from './services/job.socket.service';
 import { NotificationSocketService } from './services/notification.socket.service';
+import { NetworkDeviceSocketService } from './services/network-device.socket.service';
 
 const gateways = [WebsocketGateway];
-const services = [JobSocketService, NotificationSocketService];
+const services = [JobSocketService, NotificationSocketService, NetworkDeviceSocketService];
 const listeners = [SocketListener];
```

---

### 27. `[MODIFY]` `src/app.module.ts`
> **Action**: Import `NetworkDeviceModule` vào `AppModule`.

```diff
@@ -23,4 +23,5 @@
 import { ImportDataModule } from './modules/import-data/import-data.module';
 import { NotificationModule } from './modules/notification/notification.module';
+import { NetworkDeviceModule } from './modules/network-device/network-device.module';
 import { QueueModule } from './modules/queue/queue.module';
 import { ScheduleExecutorModule } from './modules/schedule/schedule.module';
@@ -73,4 +74,5 @@
         ImportDataModule,
         QueueModule,
+        NetworkDeviceModule,
         ScheduleExecutorModule,
         WorkerModule.register(),
```

---

## Section 5. Test Cases & Verification

### 5.1 Automated Tests & Build Verification
- `[x]` **ESLint Verification**: `ESLINT_USE_FLAT_CONFIG=false npx eslint "src/modules/network-device/**/*.ts" "src/modules/websocket/**/*.ts"`
  - *Evidence*: `0 errors, 0 warnings` (Exit code 0).
- `[x]` **Full Build Verification**: `npm run build`
  - *Evidence*: `rimraf dist && tsc -p tsconfig.build.json && nest build` executed with zero compilation errors (Exit code 0).

### 5.2 Manual Verification Steps (REST & WebSocket)
1. **Khởi động server local**: `npm run start:dev`
2. **Kích hoạt quét mạng (Trigger Scan)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/network-devices/scan \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   *Kỳ vọng*: Trả về `202 Accepted` kèm `{ status: "SCANNING", startedAt: "..." }`.
3. **Kiểm tra trạng thái quét (Scan Status)**:
   ```bash
   curl -X GET http://localhost:3000/api/v1/network-devices/scan/status \
     -H "Authorization: Bearer <TOKEN>"
   ```
4. **Lấy danh sách thiết bị kèm filter theo `type=CAMERA`**:
   ```bash
   curl -X GET "http://localhost:3000/api/v1/network-devices?filter.deviceType=CAMERA&page=1&limit=10" \
     -H "Authorization: Bearer <TOKEN>"
   ```
   *Kỳ vọng*: Trả về cấu trúc danh sách phân trang `Paginated<NetworkDeviceDto>` với các Camera ONVIF/RTSP đã phát hiện trong mạng LAN.
5. **WebSocket Verification**: Mở kết nối Socket.IO tới server và subscribe event `deviceDiscovered` để kiểm tra streaming thiết bị theo thời gian thực.
