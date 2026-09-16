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
import { NetworkDeviceType } from '../../enums';
import { NetworkSubnetHelper } from '../../helpers';
import { INetworkDeviceApproachService, INetworkScanOptions } from '../../interfaces';

@Injectable()
export class PortScanApproachService implements INetworkDeviceApproachService {
    constructor(private readonly loggerService: LoggerService) {}

    async scan(options: INetworkScanOptions = {}): Promise<NetworkDeviceDto[]> {
        if (options.ip) {
            const single = await this.probeIp(options);
            return single ? [single] : [];
        }

        const subnet = options.subnet || NetworkSubnetHelper.detectLocalSubnet();
        if (!subnet) {
            this.loggerService.warn('No active IPv4 subnet detected for TCP port scan');
            return [];
        }

        const discoveredDevices: NetworkDeviceDto[] = [];
        const ipList = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

        for (let i = 0; i < ipList.length; i += TCP_PROBE_BATCH_SIZE) {
            const batch = ipList.slice(i, i + TCP_PROBE_BATCH_SIZE);
            const batchResults = await Promise.all(batch.map((ip) => this.probeIp({ ...options, ip })));

            for (const result of batchResults) {
                if (result) discoveredDevices.push(result);
            }
        }

        return discoveredDevices;
    }

    private async probeIp(options: INetworkScanOptions): Promise<NetworkDeviceDto | null> {
        const { ip, ports, timeoutMs } = options;

        const openPorts: number[] = [];
        const portsToCheck = ports && ports.length > 0 ? ports : TCP_TARGET_PORTS;

        await Promise.all(
            portsToCheck.map(async (port) => {
                const isOpen = await this.checkPort(ip, port, timeoutMs);
                if (isOpen) openPorts.push(port);
            }),
        );

        if (openPorts.length === 0) return null;

        let deviceType = NetworkDeviceType.UNKNOWN;
        switch (true) {
            case TCP_CAMERA_PORTS.some((port) => openPorts.includes(port)):
                deviceType = NetworkDeviceType.CAMERA;
                break;
            case TCP_PRINTER_PORTS.some((port) => openPorts.includes(port)):
                deviceType = NetworkDeviceType.PRINTER;
                break;
            case TCP_ROUTER_AP_PORTS.some((port) => openPorts.includes(port)):
                deviceType = NetworkDeviceType.ROUTER_AP;
                break;
        }

        return new NetworkDeviceDto({
            openPorts,
            deviceType,
            ipAddress: ip,
            isOnline: true,
            lastSeenAt: new Date(),
        });
    }

    private checkPort(host: string, port: number, customTimeoutMs?: number): Promise<boolean> {
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

            socket.setTimeout(customTimeoutMs || TCP_SOCKET_TIMEOUT_MS);
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
