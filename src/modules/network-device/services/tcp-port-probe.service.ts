import * as net from 'node:net';
import * as os from 'node:os';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import {
    TCP_CAMERA_PORTS,
    TCP_PRINTER_PORTS,
    TCP_PROBE_BATCH_SIZE,
    TCP_ROUTER_AP_PORTS,
    TCP_SOCKET_TIMEOUT_MS,
    TCP_TARGET_PORTS,
} from '../constants';
import { NetworkDeviceDto } from '../dtos';
import { NetworkDeviceType } from '../enums';
import { IProbeService } from '../interfaces';

@Injectable()
export class TcpPortProbeService implements IProbeService {
    constructor(private readonly loggerService: LoggerService) {}

    async probe(subnet?: string): Promise<NetworkDeviceDto[]> {
        return this.probeSubnet(subnet);
    }

    async probeSubnet(customSubnet?: string): Promise<NetworkDeviceDto[]> {
        const subnet = customSubnet || this.detectLocalSubnet();
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

    private async probeIp(ip: string): Promise<NetworkDeviceDto | null> {
        const openPorts: number[] = [];

        await Promise.all(
            TCP_TARGET_PORTS.map(async (port) => {
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
