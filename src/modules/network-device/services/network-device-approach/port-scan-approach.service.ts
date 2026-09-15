import * as net from 'node:net';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../../shared/services/logger.service';
import {
    TCP_CAMERA_PORTS,
    TCP_PRINTER_PORTS,
    TCP_PROBE_BATCH_SIZE,
    TCP_ROUTER_AP_PORTS,
    TCP_SOCKET_TIMEOUT_MS,
    TCP_TARGET_PORTS,
} from '../../constants';
import { NetworkDeviceDto } from '../../dtos';
import { NetworkDeviceApproachEnum, NetworkDeviceType } from '../../enums';
import { NetworkSubnetHelper } from '../../helpers';
import { INetworkDeviceApproachResult, INetworkDeviceApproachService, INetworkDeviceTarget, IProbeService } from '../../interfaces';

@Injectable()
export class PortScanApproachService implements IProbeService, INetworkDeviceApproachService<any, NetworkDeviceDto[]> {
    constructor(private readonly loggerService: LoggerService) {}

    async execute(target: INetworkDeviceTarget = {}, _options?: any): Promise<INetworkDeviceApproachResult<NetworkDeviceDto[]>> {
        const startTime = Date.now();
        try {
            let devices: NetworkDeviceDto[] = [];
            if (target.ip) {
                const result = await this.probeIp(target.ip, target.ports);
                if (result) {
                    devices.push(result);
                }
            } else {
                devices = await this.probeSubnet(target.subnet);
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

    async probe(subnet?: string): Promise<NetworkDeviceDto[]> {
        return this.probeSubnet(subnet);
    }

    async probeSubnet(customSubnet?: string): Promise<NetworkDeviceDto[]> {
        const subnet = customSubnet || NetworkSubnetHelper.detectLocalSubnet();
        if (!subnet) {
            this.loggerService.warn('No active IPv4 subnet detected for TCP probe');
            return [];
        }

        const ipList: string[] = [];
        for (let i = 1; i <= 254; i++) {
            ipList.push(`${subnet}.${i}`);
        }

        const discoveredDevices: NetworkDeviceDto[] = [];

        for (let i = 0; i < ipList.length; i += TCP_PROBE_BATCH_SIZE) {
            const batch = ipList.slice(i, i + TCP_PROBE_BATCH_SIZE);
            const batchResults = await Promise.all(batch.map((ip) => this.probeIp(ip)));

            for (const result of batchResults) {
                if (result) discoveredDevices.push(result);
            }
        }

        return discoveredDevices;
    }

    async probeIp(ip: string, customPorts?: number[]): Promise<NetworkDeviceDto | null> {
        const portsToCheck = customPorts && customPorts.length > 0 ? customPorts : TCP_TARGET_PORTS;
        const openPorts: number[] = [];

        await Promise.all(
            portsToCheck.map(async (port) => {
                const isOpen = await this.checkPort(ip, port);
                if (isOpen) openPorts.push(port);
            }),
        );

        if (openPorts.length === 0) return null;

        let deviceType = NetworkDeviceType.UNKNOWN;
        if (TCP_CAMERA_PORTS.some((port) => openPorts.includes(port))) {
            deviceType = NetworkDeviceType.CAMERA;
        } else if (TCP_PRINTER_PORTS.some((port) => openPorts.includes(port))) {
            deviceType = NetworkDeviceType.PRINTER;
        } else if (TCP_ROUTER_AP_PORTS.some((port) => openPorts.includes(port))) {
            deviceType = NetworkDeviceType.ROUTER_AP;
        }

        return new NetworkDeviceDto({
            ipAddress: ip,
            deviceType,
            openPorts,
            isOnline: true,
            lastSeenAt: new Date(),
        });
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

            socket.setTimeout(TCP_SOCKET_TIMEOUT_MS);
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
}
