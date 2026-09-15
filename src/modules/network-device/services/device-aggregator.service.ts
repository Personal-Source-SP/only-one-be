import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isNil, omitBy, union } from 'lodash';

import { CacheService } from '../../../shared/services/cache.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { WebSocketEvent } from '../../websocket/enums/subscribe-name.enum';
import {
    NETWORK_DEVICE_APPROACH_SERVICE_MAP,
    NETWORK_DEVICE_SCAN_LOCK_KEY,
    NETWORK_DEVICE_SCAN_LOCK_TTL_SECONDS,
    NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
    NETWORK_DEVICE_SCAN_STATE_COMPLETED_TTL_SECONDS,
    NETWORK_DEVICE_SCAN_STATE_KEY,
} from '../constants';
import { NetworkDeviceDto, TriggerScanRequestDto } from '../dtos';
import { ExecuteApproachRequestDto } from '../dtos/requests';
import { ScanStatusResponseDto } from '../dtos/responses';
import { NetworkDeviceApproachEnum, NetworkDeviceType, NetworkScanStatus } from '../enums';
import {
    IDeviceDiscoveredEventPayload,
    INetworkDeviceApproachResult,
    INetworkDeviceApproachService,
    IScanCompletedEventPayload,
    IScanStartedEventPayload,
} from '../interfaces';
import { NetworkDeviceService } from './network-device.service';

@Injectable()
export class DeviceAggregatorService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly eventEmitter: EventEmitter2,
        private readonly loggerService: LoggerService,
        @Inject(NETWORK_DEVICE_APPROACH_SERVICE_MAP)
        private readonly approachMap: Record<NetworkDeviceApproachEnum, INetworkDeviceApproachService>,
        private readonly networkDeviceService: NetworkDeviceService,
    ) {}

    async getScanStatus(): Promise<ScanStatusResponseDto> {
        const cachedState = await this.getCachedScanState();
        if (cachedState) {
            return new ScanStatusResponseDto(cachedState);
        }

        return new ScanStatusResponseDto({
            status: NetworkScanStatus.IDLE,
            devicesDiscoveredCount: 0,
            startedAt: null,
            completedAt: null,
        });
    }

    async executeApproach(dto: ExecuteApproachRequestDto): Promise<INetworkDeviceApproachResult> {
        const service = this.approachMap[dto.approach];
        if (!service) throw new Error(`Approach ${dto.approach} is not supported`);

        return service.execute(dto, { timeoutMs: dto.timeoutMs });
    }

    async scanAndAggregate(dto: TriggerScanRequestDto = {}): Promise<void> {
        const lockToken = randomUUID();
        const acquired = await this.acquireScanLock(lockToken);

        if (!acquired) {
            this.loggerService.warn('Scan is already in progress on a cluster node, ignoring duplicate trigger');
            return;
        }

        const startedAt = new Date().toISOString();
        let discoveredCount = 0;

        await this.saveScanState(
            {
                startedAt,
                completedAt: null,
                devicesDiscoveredCount: 0,
                status: NetworkScanStatus.SCANNING,
            },
            NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
        );

        const startPayload: IScanStartedEventPayload = {
            startedAt,
            status: NetworkScanStatus.SCANNING,
        };
        this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_STARTED, startPayload);

        try {
            this.loggerService.log('Starting parallel Network Probing Pipeline (ONVIF, ARP, TCP) via Service Map...');

            const [onvifRes, arpRes, tcpRes] = await Promise.all([
                this.approachMap[NetworkDeviceApproachEnum.PROTOCOL_AUTH].execute(
                    { subnet: dto.subnet },
                    { timeoutMs: dto.probeTimeoutMs ?? 3000 },
                ),
                this.approachMap[NetworkDeviceApproachEnum.NETWORK_DISCOVERY].execute({ subnet: dto.subnet }),
                this.approachMap[NetworkDeviceApproachEnum.PORT_SCAN].execute({ subnet: dto.subnet }),
            ]);

            const probeResults: NetworkDeviceDto[][] = [
                (onvifRes.data as NetworkDeviceDto[]) || [],
                (arpRes.data as NetworkDeviceDto[]) || [],
                (tcpRes.data as NetworkDeviceDto[]) || [],
            ];

            const mergedDevices = this.mergeProbeResults(probeResults);
            discoveredCount = await this.persistAndBroadcastDevices(mergedDevices, startedAt);

            const completedAt = new Date().toISOString();
            await this.saveScanState(
                {
                    startedAt,
                    completedAt,
                    status: NetworkScanStatus.COMPLETED,
                    devicesDiscoveredCount: discoveredCount,
                },
                NETWORK_DEVICE_SCAN_STATE_COMPLETED_TTL_SECONDS,
            );

            this.loggerService.log(`Network scan completed. Discovered ${discoveredCount} devices.`);

            const completedPayload: IScanCompletedEventPayload = {
                completedAt,
                totalDiscovered: discoveredCount,
                status: NetworkScanStatus.COMPLETED,
            };
            this.eventEmitter.emit(WebSocketEvent.DEVICE_SCAN_COMPLETED, completedPayload);
        } catch (error) {
            const completedAt = new Date().toISOString();
            await this.saveScanState(
                {
                    startedAt,
                    completedAt,
                    status: NetworkScanStatus.FAILED,
                    devicesDiscoveredCount: discoveredCount,
                },
                NETWORK_DEVICE_SCAN_STATE_COMPLETED_TTL_SECONDS,
            );

            this.loggerService.error(`Network scan failed: ${error.message}`);
        } finally {
            await this.releaseScanLock(lockToken);
        }
    }

    private async acquireScanLock(token: string): Promise<boolean> {
        return this.cacheService.setIfNotExists(NETWORK_DEVICE_SCAN_LOCK_KEY, token, NETWORK_DEVICE_SCAN_LOCK_TTL_SECONDS);
    }

    private async releaseScanLock(token: string): Promise<boolean> {
        return this.cacheService.releaseLock(NETWORK_DEVICE_SCAN_LOCK_KEY, token);
    }

    private async getCachedScanState(): Promise<ScanStatusResponseDto | null> {
        return this.cacheService.get<ScanStatusResponseDto>(NETWORK_DEVICE_SCAN_STATE_KEY);
    }

    private async saveScanState(state: Partial<ScanStatusResponseDto>, ttlSeconds: number): Promise<void> {
        await this.cacheService.set(NETWORK_DEVICE_SCAN_STATE_KEY, state, ttlSeconds);
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

    private async persistAndBroadcastDevices(devices: NetworkDeviceDto[], startedAt: string): Promise<number> {
        let count = 0;
        for (const device of devices) {
            const networkDevice = await this.networkDeviceService.upsertNetworkDevice(device);
            count++;

            await this.saveScanState(
                {
                    status: NetworkScanStatus.SCANNING,
                    devicesDiscoveredCount: count,
                    startedAt,
                    completedAt: null,
                },
                NETWORK_DEVICE_SCAN_STATE_ACTIVE_TTL_SECONDS,
            );

            const discoveredPayload: IDeviceDiscoveredEventPayload = { networkDevice };
            this.eventEmitter.emit(WebSocketEvent.DEVICE_DISCOVERED, discoveredPayload);
        }
        return count;
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
}
