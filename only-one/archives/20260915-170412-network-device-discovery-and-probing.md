---
id: 20260915-170412-network-device-discovery-and-probing
title: Hệ Thống Tự Động Khám Phá Thiết Bị Mạng & WS-Discovery ONVIF Probe (Network Device Discovery Engine)
archived_at: 2026-09-15
status: active
references:
  - only-one/archives/20260903-192300-sync-websocket-infrastructure.md
affected_modules:
  - src/modules/network-device
  - src/modules/websocket
---

# Archive: Hệ Thống Tự Động Khám Phá Thiết Bị Mạng & WS-Discovery ONVIF Probe (Network Device Discovery Engine)

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**:
  - Hệ thống trước đây chưa có khả năng tự động rà quét subnet mạng nội bộ (LAN/Wi-Fi). Các thiết bị ngoại vi và IP Camera (Hikvision, Dahua, Ezviz, TP-Link...) cần phải được cấu hình thủ công từng địa chỉ IP tĩnh và port.
  - Ban đầu khi triển khai ONVIF probe, bản tin SOAP XML bị sai lệch namespace (`<dn:Probe>` thuộc WSDL namespace thay vì WS-Discovery schema `http://schemas.xmlsoap.org/ws/2005/04/discovery`), bộ lọc `Types` bị gán cứng `dn:NetworkVideoTransmitter`, và chỉ gửi multicast `239.255.255.250` dẫn đến việc 100% camera/thiết bị mạng drop gói tin và trả về kết quả rỗng.
- **Giá trị (Value)**:
  - Triển khai kiến trúc quét mạng đa tầng song song (`DeviceAggregatorService`) kết hợp:
    1. **ONVIF WS-Discovery Probe (`OnvifProbeService`)**: Chuẩn hóa XML SOAP Probe với multi-target broadcast (Multicast `239.255.255.250`, Global Broadcast `255.255.255.255`, Subnet Directed Broadcast trên các active network interfaces), bóc tách metadata (XAddrs, Scopes, Types) và phân loại thông minh (`CAMERA`, `PRINTER`, `ROUTER_AP`, `SMART_IOT`).
    2. **ARP Scanning (`ArpScanService`)**: Thu thập bảng ARP nội bộ của hệ điều hành để phân giải cặp IP-MAC.
    3. **OUI Database Matching (`OuiLookupService`)**: Nhận diện nhà sản xuất phần cứng (Vendor) và loại thiết bị mặc định dựa trên tiền tố địa chỉ MAC (OUI prefix).
    4. **TCP Port Probing (`TcpPortProbeService`)**: Quét đồng thời các cổng dịch vụ phổ biến (80, 443, 554 RTSP, 8000, 8080, 37777...) với kiểm soát concurrency và timeout chặt chẽ (300ms) để không gây block event loop.
  - Tích hợp streaming thời gian thực qua WebSocket Gateway (`deviceDiscovered`, `deviceScanStarted`, `deviceScanCompleted`) và phân trang REST API chuẩn (`nestjs-paginate`).

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Pipeline Quét Đa Tầng Song Song (`DeviceAggregatorService.scanAndAggregate`)**:
  - Chạy đồng thời `Promise.all([onvifProbe, arpScan, tcpPortProbe])`.
  - Hợp nhất dữ liệu (`mergeProbeResults`) theo thứ tự ưu tiên độ chính xác: ONVIF (chính xác nhất) $\rightarrow$ ARP + OUI $\rightarrow$ TCP Port Probe.
  - Phân tán trạng thái quét và chống race condition bằng distributed lock (`NETWORK_DEVICE_SCAN_LOCK_KEY`) và Redis cache state (`NETWORK_DEVICE_SCAN_STATE_KEY`).
- **WS-Discovery Protocol Compliance**:
  - Bản tin Probe SOAP tuân thủ nghiêm ngặt WS-Discovery 2005/04 schema (`xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"`).
  - Hỗ trợ gửi song song cả bản tin ONVIF Device probe và Universal Probe (`<d:Probe/>`) qua cả Multicast và Subnet Directed Broadcast để vượt qua các router/switch bật IGMP snooping.
- **Persistence & Realtime Event Streaming**:
  - Lưu trữ vào cơ sở dữ liệu qua `NetworkDeviceService.upsertNetworkDevice` (sử dụng IP Address làm định danh duy nhất).
  - Bắn sự kiện realtime qua `EventEmitter2` tới `WebsocketGateway` để phân phối cho client đang kết nối.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [device-aggregator.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/network-device/services/device-aggregator.service.ts): Service điều phối luồng quét song song, merge kết quả và cập nhật trạng thái Redis.
- [onvif-probe.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/network-device/services/onvif-probe.service.ts): Service gửi nhận WS-Discovery SOAP UDP packets, phân giải multi-target broadcast và parse XML.
- [arp-scan.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/network-device/services/arp-scan.service.ts): Service phân tích bảng ARP của OS để lấy IP và MAC address.
- [oui-lookup.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/network-device/services/oui-lookup.service.ts): Tra cứu OUI MAC để xác định Vendor và Device Type.
- [tcp-port-probe.service.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/network-device/services/tcp-port-probe.service.ts): Thử nghiệm kết nối socket TCP nhanh tới các cổng thiết bị phổ biến.
- [onvif.constant.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/network-device/constants/onvif.constant.ts): Định nghĩa bản tin WS-Discovery SOAP và các hằng số mạng.
- [onvif-probe.service.spec.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/network-device/services/_tests/onvif-probe.service.spec.ts): Bộ unit test tự động xác thực WS-Discovery format, XML parser và broadcast target resolution.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Unit Test**: `npx ts-node -r tsconfig-paths/register src/modules/network-device/services/_tests/onvif-probe.service.spec.ts` $\rightarrow$ `PASS (11/11 tests pass)`.
- **TypeScript Build**: `npm run build` $\rightarrow$ `PASS (0 errors)`.
- **Linting**: `ESLINT_USE_FLAT_CONFIG=false npx eslint src/modules/network-device` $\rightarrow$ `PASS (0 errors)`.
- **Live Local Network Scan**: `PASS (Phát hiện và nhận diện thiết bị mạng trên subnet 192.168.1.0/24 đầy đủ metadata)`.
