import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isNil, omitBy, union } from 'lodash';

import { LoggerService } from '../../../shared/services/logger.service';
import { WebSocketEvent } from '../../websocket/enums/subscribe-name.enum';
import { NetworkDeviceDto } from '../dtos';
import { ScanStatusResponseDto } from '../dtos/responses';
import { NetworkDeviceType, NetworkScanStatus } from '../enums';
import { IDeviceDiscoveredEventPayload, IScanCompletedEventPayload, IScanStartedEventPayload } from '../interfaces';
import { ArpScanService } from './arp-scan.service';
import { NetworkDeviceService } from './network-device.service';
import { OnvifProbeService } from './onvif-probe.service';
import { TcpPortProbeService } from './tcp-port-probe.service';

@Injectable()
export class DeviceAggregatorService {
    private discoveredCount = 0;
    private startedAt: Date | null = null;
    private completedAt: Date | null = null;
    private scanStatus: NetworkScanStatus = NetworkScanStatus.IDLE;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly loggerService: LoggerService,
        private readonly arpScanService: ArpScanService,
        private readonly onvifProbeService: OnvifProbeService,
        private readonly tcpPortProbeService: TcpPortProbeService,
        private readonly networkDeviceService: NetworkDeviceService,
    ) {}

    getScanStatus(): ScanStatusResponseDto {
        return new ScanStatusResponseDto({
            status: this.scanStatus,
            devicesDiscoveredCount: this.discoveredCount,
            startedAt: this.startedAt?.toISOString() || null,
            completedAt: this.completedAt?.toISOString() || null,
        });
    }

    async scanAndAggregate(subnet?: string, probeTimeoutMs = 3000): Promise<void> {
        if (this.scanStatus === NetworkScanStatus.SCANNING) {
            this.loggerService.warn('Scan is already in progress, ignoring duplicate trigger');
            return;
        }

        this.initScanState();

        try {
            this.loggerService.log('Starting parallel Network Probing Pipeline (ONVIF, ARP, TCP)...');

            const probeResults = await Promise.all([
                this.onvifProbeService.probe(subnet, probeTimeoutMs),
                this.arpScanService.scan(),
                this.tcpPortProbeService.probeSubnet(subnet),
            ]);

            const mergedDevices = this.mergeProbeResults(probeResults);
            await this.persistAndBroadcastDevices(mergedDevices);

            this.scanStatus = NetworkScanStatus.COMPLETED;
            this.completedAt = new Date();
            this.loggerService.log(`Network scan completed. Discovered ${this.discoveredCount} devices.`);

            const completedPayload: IScanCompletedEventPayload = {
                status: NetworkScanStatus.COMPLETED,
                totalDiscovered: this.discoveredCount,
                completedAt: this.completedAt.toISOString(),
            };
            this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_COMPLETED, completedPayload);
        } catch (error) {
            this.scanStatus = NetworkScanStatus.FAILED;
            this.completedAt = new Date();
            this.loggerService.error(`Network scan failed: ${error.message}`);
        }
    }

    private initScanState(): void {
        this.discoveredCount = 0;
        this.startedAt = new Date();
        this.completedAt = null;
        this.scanStatus = NetworkScanStatus.SCANNING;

        const startPayload: IScanStartedEventPayload = {
            status: NetworkScanStatus.SCANNING,
            startedAt: this.startedAt.toISOString(),
        };
        this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_STARTED, startPayload);
    }

    private mergeProbeResults(probeResults: NetworkDeviceDto[][]): NetworkDeviceDto[] {
        const mergedMap = new Map<string, NetworkDeviceDto>();

        // Thứ tự ưu tiên: ONVIF (chính xác nhất) -> ARP -> TCP Port
        for (const deviceList of probeResults) {
            for (const item of deviceList) {
                this.mergeSingleDevice(mergedMap, item);
            }
        }

        return Array.from(mergedMap.values());
    }

    private mergeSingleDevice(mergedMap: Map<string, NetworkDeviceDto>, item: NetworkDeviceDto): void {
        const existing = mergedMap.get(item.ipAddress);
        if (!existing) {
            mergedMap.set(item.ipAddress, new NetworkDeviceDto({ ...item }));
            return;
        }

        Object.assign(
            existing,
            omitBy(
                {
                    macAddress: item.macAddress,
                    vendor: item.vendor,
                    model: item.model,
                    firmwareVersion: item.firmwareVersion,
                    onvifMetadata: item.onvifMetadata,
                },
                isNil,
            ),
        );

        existing.openPorts = union(existing.openPorts, item.openPorts);

        if (item.deviceType === NetworkDeviceType.CAMERA || existing.deviceType === NetworkDeviceType.UNKNOWN) {
            existing.deviceType = item.deviceType;
        }
    }

    private async persistAndBroadcastDevices(devices: NetworkDeviceDto[]): Promise<void> {
        for (const device of devices) {
            const networkDevice = await this.networkDeviceService.upsertNetworkDevice(device);
            this.discoveredCount++;

            const discoveredPayload: IDeviceDiscoveredEventPayload = { networkDevice };
            this.eventEmitter.emit(WebSocketEvent.DEVICE_DISCOVERED, discoveredPayload);
        }
    }
}
