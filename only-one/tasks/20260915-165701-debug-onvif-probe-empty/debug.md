# Debug: OnvifProbeService luôn trả về mảng rỗng khi quét thiết bị mạng

---
status: fixed
slug: onvif-probe-empty
started_at: 2026-09-15 16:57:01
completed_at: 2026-09-15 17:03:30
reproduction_test: npx ts-node -r tsconfig-paths/register src/modules/network-device/services/_tests/onvif-probe.service.spec.ts
---

## Section 1. Symptom & Red Feedback Loop (Triệu chứng & Tái hiện Lỗi)
- **Triệu chứng & Hành vi sai lệch**:
  - Tại `DeviceAggregatorService` (dòng 84: `this.onvifProbeService.probe(dto.subnet, dto.probeTimeoutMs ?? 3000)`), kết quả trả về từ `OnvifProbeService` luôn là mảng rỗng `[]` mặc dù trong mạng nội bộ có các thiết bị hỗ trợ WS-Discovery / ONVIF.
  - Các thiết bị mạng không hề phản hồi lại gói tin UDP multicast do `OnvifProbeService` gửi đi.
- **Red Test Case**:
  - Khi gửi bản tin XML probe cũ được tạo từ `createOnvifProbeMessage` (`<dn:Probe><dn:Types>dn:NetworkVideoTransmitter</dn:Types></dn:Probe>` với namespace sai) tới `239.255.255.250:3702`, 100% thiết bị mạng drop gói tin và không nhận được bất kỳ phản hồi nào (0 responses).
  - Ngược lại, khi gửi gói tin chuẩn WS-Discovery schema (`xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"`) kèm broadcast multi-target, thiết bị trên mạng (`192.168.1.222:3702`) phản hồi ngay lập tức với XML `ProbeMatches`.
- **Lệnh chạy tái hiện (Fast Test Command)**:
  `npx ts-node -r tsconfig-paths/register src/modules/network-device/services/_tests/onvif-probe.service.spec.ts`

## Section 2. Root Cause Analysis & Hypotheses (Phân tích Nguyên nhân)
- **Cơ chế lỗi cốt lõi (Mechanical Root Cause)**:
  1. **Sai lệch XML Schema & Namespace trong `createOnvifProbeMessage` (`onvif.constant.ts`)**:
     - Bản tin XML tạo bởi `createOnvifProbeMessage` sử dụng thẻ `<dn:Probe>` và `<dn:Types>` với prefix `dn` trỏ đến `http://www.onvif.org/ver10/network/wsdl`.
     - Theo chuẩn WS-Discovery (WS-Discovery 2005/04 & ONVIF Core Spec), phần tử `Probe` và `Types` **bắt buộc** phải thuộc namespace WS-Discovery `http://schemas.xmlsoap.org/ws/2005/04/discovery` (thường có prefix `d:` hoặc `wsd:`).
     - Do sai namespace, parser WS-Discovery trên các thiết bị mạng / IP Camera loại bỏ gói tin (silent drop) vì không khớp schema.
  2. **Ràng buộc cứng kiểu thiết bị (`Types`) khiến các thiết bị khác bị loại bỏ**:
     - Bản tin cũ chỉ lọc duy nhất `dn:NetworkVideoTransmitter`. Theo WS-Discovery spec (Section 5.2), thiết bị chỉ phản hồi nếu nó thỏa mãn đồng thời các kiểu trong thẻ `Types`. Nếu thiết bị khai báo `tds:Device`, profile khác hoặc là NVR/IoT thì sẽ không phản hồi.
     - Cần gửi bản tin probe phổ quát (`<d:Probe/>`) song song hoặc bản tin hỗ trợ đa profile để phát hiện toàn bộ thiết bị hỗ trợ WS-Discovery/ONVIF.
  3. **Bỏ qua tham số `subnet` & Thiếu cơ chế Subnet Broadcast**:
     - `OnvifProbeService.probe(subnet, timeoutMs)` nhận vào tham số `subnet` từ `dto.subnet` nhưng không hề sử dụng.
     - `client.send` chỉ gửi duy nhất tới địa chỉ multicast `239.255.255.250`. Trên nhiều môi trường mạng LAN/Wi-Fi (đặc biệt khi có IGMP snooping, firewall, hoặc máy chủ có nhiều network interface như `en0`, `en1`, Docker bridge), multicast UDP packet dễ bị chặn hoặc gửi nhầm interface.
     - Cần gửi probe tới cả Multicast (`239.255.255.250`), Broadcast toàn cục (`255.255.255.255`) và Directed Subnet Broadcast (dựa trên các network interface hoạt động hoặc `subnet` truyền vào).
  4. **Nhận diện loại thiết bị (`deviceType`) bị gán cứng `CAMERA`**:
     - `OnvifProbeService` gán cứng `deviceType = NetworkDeviceType.CAMERA` cho tất cả thiết bị trả về, kể cả máy in (`PrintDeviceType`), switch/router hoặc thiết bị IoT khác. Cần phân tích `Types` và `Scopes` để gán đúng loại thiết bị (`CAMERA`, `PRINTER`, `SMART_IOT`, ...).
  5. **Regex bóc tách XML chưa tối ưu**:
     - Regex bóc tách `xAddrs`, `types`, `scopes` trong `parseOnvifXml` dùng `/<[^:]*:?XAddrs[^>]*>/i` có thể gặp lỗi nếu XML không dùng namespace prefix hoặc có định dạng đặc thù. Cần chuẩn hóa sang `/<(?:[a-zA-Z0-9_-]+:)?(XAddrs|Types|Scopes)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?\1>/i`.

- **Invariants bị vi phạm**:
  - Hợp đồng giao thức WS-Discovery SOAP-over-UDP bị vi phạm do XML namespace sai.
  - Thiết kế đa phương thức quét (`DeviceAggregatorService`) bị mất đi nguồn dữ liệu từ tầng ONVIF probe.

- **Chiến lược khắc phục dự kiến (Proposed Fix Strategy)**:
  1. Chuẩn hóa `createOnvifProbeMessage` và thêm `createUniversalProbeMessage` trong `onvif.constant.ts`.
  2. Nâng cấp `OnvifProbeService.probe`:
     - Gửi probe tới danh sách target: Multicast `239.255.255.250`, Global Broadcast `255.255.255.255`, và Subnet Broadcast của các network interface hoạt động (hoặc subnet được chỉ định).
     - Phân loại `deviceType` dựa trên `types` và `scopes`.
     - Cải thiện hàm `parseOnvifXml` với regex chuẩn xác hơn.
  3. Viết bộ unit test toàn diện cho `OnvifProbeService` trong `src/modules/network-device/services/_tests/onvif-probe.service.spec.ts`.

---

## Section 3. Directory Structure & Task Matrix
### 3.1 Directory Structure Changes
```text
src/modules/network-device/
├── constants/
│   └── [MODIFY] onvif.constant.ts                                # Standard WS-Discovery namespaces & universal probe
└── services/
    ├── [MODIFY] onvif-probe.service.ts                           # Multi-target broadcast/multicast & type inference
    └── _tests/
        └── [NEW]    onvif-probe.service.spec.ts                  # Unit & regression tests for ONVIF probe
```

### 3.2 Task Matrix
| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `src/modules/network-device/constants/onvif.constant.ts` | `createOnvifProbeMessage`, `createUniversalProbeMessage`, `ONVIF_GLOBAL_BROADCAST_IP` | `None` | `npm run build` |
| **2** | `[x]` | `[MODIFY]` | `src/modules/network-device/services/onvif-probe.service.ts` | `OnvifProbeService.probe`, `inferDeviceType`, `resolveBroadcastAndMulticastTargets`, `parseOnvifXml` | `Order 1` | `npx ts-node -r tsconfig-paths/register src/modules/network-device/services/_tests/onvif-probe.service.spec.ts` |
| **3** | `[x]` | `[NEW]` | `src/modules/network-device/services/_tests/onvif-probe.service.spec.ts` | `describe('OnvifProbeService')...` | `Order 2` | `npx ts-node -r tsconfig-paths/register src/modules/network-device/services/_tests/onvif-probe.service.spec.ts` |
| **4** | `[x]` | `[MODIFY]` | `only-one/rules.md` | Repository Rules | `Order 3` | `git diff only-one/rules.md` |

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `src/modules/network-device/constants/onvif.constant.ts`
```diff
 export const ONVIF_MULTICAST_IP = '239.255.255.250';
+export const ONVIF_GLOBAL_BROADCAST_IP = '255.255.255.255';
 export const ONVIF_MULTICAST_PORT = 3702;
 export const DEFAULT_ONVIF_PROBE_TIMEOUT_MS = 3000;
 
 export const createOnvifProbeMessage = (messageId: string): string => `<?xml version="1.0" encoding="utf-8"?>
-<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
+<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
   <s:Header>
-    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">uuid:${messageId}</wsa:MessageID>
-    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
-    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
+    <wsa:MessageID>uuid:${messageId}</wsa:MessageID>
+    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
+    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
   </s:Header>
   <s:Body>
-    <dn:Probe><dn:Types>dn:NetworkVideoTransmitter</dn:Types></dn:Probe>
+    <d:Probe>
+      <d:Types>dn:NetworkVideoTransmitter tds:Device</d:Types>
+    </d:Probe>
   </s:Body>
-</Envelope>`;
+</s:Envelope>`;
+
+export const createUniversalProbeMessage = (messageId: string): string => `<?xml version="1.0" encoding="utf-8"?>
+<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
+  <s:Header>
+    <wsa:MessageID>uuid:${messageId}</wsa:MessageID>
+    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
+    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
+  </s:Header>
+  <s:Body>
+    <d:Probe/>
+  </s:Body>
+</s:Envelope>`;
```

### 2. `[MODIFY]` `src/modules/network-device/services/onvif-probe.service.ts`
```diff
-import * as crypto from 'node:crypto';
-import * as dgram from 'node:dgram';
+import * as crypto from 'node:crypto';
+import * as dgram from 'node:dgram';
+import * as os from 'node:os';
...
-                    const device = new NetworkDeviceDto({
-                        ipAddress: ip,
-                        deviceType: NetworkDeviceType.CAMERA,
+                    const deviceType = this.inferDeviceType(metadata);
+                    const vendor = this.extractVendorFromScopes(metadata.scopes);
+                    const model = this.extractModelFromScopes(metadata.scopes);
...
+                    const targetIps = this.resolveBroadcastAndMulticastTargets(subnet);
+                    for (const probeMessage of probeMessages) {
+                        const buffer = Buffer.from(probeMessage, 'utf8');
+                        for (const targetIp of targetIps) {
+                            client.send(buffer, 0, buffer.length, ONVIF_MULTICAST_PORT, targetIp, ...);
```

## Section 5. Verification & Regression Guard
- **Automated Tests**:
  - `npx ts-node -r tsconfig-paths/register src/modules/network-device/services/_tests/onvif-probe.service.spec.ts`: `PASS (Green) (11 tests passed in 10ms)`
  - Full TypeScript Build (`npm run build`): `PASS`
  - ESLint Validation (`ESLINT_USE_FLAT_CONFIG=false npx eslint src/modules/network-device`): `PASS (0 errors)`
  - Live Local Network Probe: `PASS (Discovered 192.168.1.222 with ports 3702, 53000 and valid XML metadata)`
- **Bài học kinh nghiệm (Lessons Learned)**:
  - Cập nhật quy tắc âm vào `only-one/rules.md`: **[AVOID]** Using non-standard XML namespaces (`<dn:Probe>`) or relying solely on single-target multicast IP (`239.255.255.250`) during ONVIF / WS-Discovery network probing.
