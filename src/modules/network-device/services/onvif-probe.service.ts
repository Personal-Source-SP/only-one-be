import * as crypto from 'node:crypto';
import * as dgram from 'node:dgram';
import * as os from 'node:os';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import {
    createOnvifProbeMessage,
    createUniversalProbeMessage,
    DEFAULT_ONVIF_PROBE_TIMEOUT_MS,
    ONVIF_GLOBAL_BROADCAST_IP,
    ONVIF_MULTICAST_IP,
    ONVIF_MULTICAST_PORT,
} from '../constants';
import { NetworkDeviceDto } from '../dtos';
import { NetworkDeviceType } from '../enums';
import { IOnvifMetadata, IProbeService } from '../interfaces';

@Injectable()
export class OnvifProbeService implements IProbeService {
    constructor(private readonly loggerService: LoggerService) {}

    async probe(subnet?: string, timeoutMs = DEFAULT_ONVIF_PROBE_TIMEOUT_MS): Promise<NetworkDeviceDto[]> {
        return new Promise((resolve) => {
            const discoveredMap = new Map<string, NetworkDeviceDto>();
            const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            const messageId = crypto.randomUUID();
            const probeMessages = [createOnvifProbeMessage(messageId), createUniversalProbeMessage(crypto.randomUUID())];

            const timer = setTimeout(() => cleanup(), timeoutMs);

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
                this.loggerService.error(`ONVIF Probe UDP socket error: ${err.message}`);
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

                    const deviceType = this.inferDeviceType(metadata);
                    const vendor = this.extractVendorFromScopes(metadata.scopes);
                    const model = this.extractModelFromScopes(metadata.scopes);

                    const device = new NetworkDeviceDto({
                        ipAddress: ip,
                        deviceType,
                        vendor,
                        model,
                        openPorts,
                        onvifMetadata: metadata,
                        isOnline: true,
                        lastSeenAt: new Date(),
                    });

                    discoveredMap.set(ip, device);
                    this.loggerService.log(
                        `ONVIF/WS-Discovery device discovered: ${ip} (${device.vendor || 'Unknown Vendor'}, Type: ${deviceType})`,
                    );
                } catch (err) {
                    this.loggerService.error(`Failed to parse ONVIF message from ${rinfo.address}: ${err.message}`);
                }
            });

            client.bind(0, () => {
                try {
                    client.setBroadcast(true);
                    client.setMulticastTTL(128);

                    const targetIps = this.resolveBroadcastAndMulticastTargets(subnet);
                    for (const probeMessage of probeMessages) {
                        const buffer = Buffer.from(probeMessage, 'utf8');
                        for (const targetIp of targetIps) {
                            client.send(buffer, 0, buffer.length, ONVIF_MULTICAST_PORT, targetIp, (err) => {
                                if (err) {
                                    this.loggerService.warn(`Failed to send ONVIF probe packet to ${targetIp}: ${err.message}`);
                                }
                            });
                        }
                    }
                } catch (e) {
                    this.loggerService.error(`Error configuring UDP socket: ${e.message}`);
                    cleanup();
                }
            });
        });
    }

    resolveBroadcastAndMulticastTargets(subnet?: string): string[] {
        const targets = new Set<string>([ONVIF_MULTICAST_IP, ONVIF_GLOBAL_BROADCAST_IP]);

        // Add local interface broadcast addresses
        const interfaces = os.networkInterfaces();
        for (const ifaceList of Object.values(interfaces)) {
            for (const iface of ifaceList || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const broadcast = this.calculateBroadcastAddress(iface.address, iface.netmask);
                    if (broadcast) {
                        targets.add(broadcast);
                    }
                }
            }
        }

        // Add subnet-specific broadcast if provided
        if (subnet) {
            const subnetBroadcast = this.parseSubnetBroadcast(subnet);
            if (subnetBroadcast) {
                targets.add(subnetBroadcast);
            }
        }

        return Array.from(targets);
    }

    calculateBroadcastAddress(ip: string, netmask: string): string | null {
        try {
            const ipParts = ip.split('.').map(Number);
            const maskParts = netmask.split('.').map(Number);
            if (ipParts.length !== 4 || maskParts.length !== 4) return null;

            const bcastParts = ipParts.map((part, i) => part | (~maskParts[i] & 255));
            return bcastParts.join('.');
        } catch {
            return null;
        }
    }

    parseSubnetBroadcast(subnet: string): string | null {
        try {
            const cleanSubnet = subnet.trim();
            if (cleanSubnet.includes('/')) {
                const [baseIp, prefixStr] = cleanSubnet.split('/');
                const prefix = parseInt(prefixStr, 10);
                if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;

                const ipParts = baseIp.split('.').map(Number);
                if (ipParts.length !== 4) return null;

                const mask = (0xffffffff << (32 - prefix)) >>> 0;
                const maskParts = [(mask >>> 24) & 255, (mask >>> 16) & 255, (mask >>> 8) & 255, mask & 255];
                return this.calculateBroadcastAddress(baseIp, maskParts.join('.'));
            }

            const parts = cleanSubnet.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
            }
            return null;
        } catch {
            return null;
        }
    }

    inferDeviceType(metadata: IOnvifMetadata): NetworkDeviceType {
        const typesLower = (metadata.types || '').toLowerCase();
        const scopesStr = (metadata.scopes || []).join(' ').toLowerCase();
        const combined = `${typesLower} ${scopesStr}`;

        if (
            combined.includes('networkvideotransmitter') ||
            combined.includes('camera') ||
            combined.includes('videosource') ||
            combined.includes('nvr') ||
            combined.includes('dvr') ||
            combined.includes('axis') ||
            combined.includes('hikvision') ||
            combined.includes('dahua') ||
            combined.includes('uniview') ||
            combined.includes('ezviz') ||
            combined.includes('imou')
        ) {
            return NetworkDeviceType.CAMERA;
        }

        if (combined.includes('printdevicetype') || combined.includes('printer') || combined.includes('print')) {
            return NetworkDeviceType.PRINTER;
        }

        if (
            combined.includes('router') ||
            combined.includes('accesspoint') ||
            combined.includes('gateway') ||
            combined.includes('switch')
        ) {
            return NetworkDeviceType.ROUTER_AP;
        }

        if (metadata.xAddrs?.some((x) => x.toLowerCase().includes('onvif')) || scopesStr.includes('onvif://')) {
            return NetworkDeviceType.CAMERA;
        }

        return NetworkDeviceType.SMART_IOT;
    }

    parseOnvifXml(xml: string): IOnvifMetadata {
        const metadata: IOnvifMetadata = { rawXml: xml };

        const xAddrsMatch = xml.match(/<(?:[a-zA-Z0-9_-]+:)?XAddrs\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?XAddrs>/i);
        if (xAddrsMatch) {
            metadata.xAddrs = xAddrsMatch[1].trim().split(/\s+/).filter(Boolean);
        }

        const typesMatch = xml.match(/<(?:[a-zA-Z0-9_-]+:)?Types\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Types>/i);
        if (typesMatch) {
            metadata.types = typesMatch[1].trim();
        }

        const scopesMatch = xml.match(/<(?:[a-zA-Z0-9_-]+:)?Scopes\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Scopes>/i);
        if (scopesMatch) {
            metadata.scopes = scopesMatch[1].trim().split(/\s+/).filter(Boolean);
        }

        return metadata;
    }

    private extractVendorFromScopes(scopes?: string[]): string | undefined {
        if (!scopes) return undefined;
        for (const scope of scopes) {
            const match =
                scope.match(/onvif:\/\/www\.onvif\.org\/name\/([^/\s]+)/i) ||
                scope.match(/onvif:\/\/www\.onvif\.org\/hardware\/([^/\s]+)/i);
            if (match) return decodeURIComponent(match[1]);
        }
        return undefined;
    }

    private extractModelFromScopes(scopes?: string[]): string | undefined {
        if (!scopes) return undefined;
        for (const scope of scopes) {
            const match = scope.match(/onvif:\/\/www\.onvif\.org\/model\/([^/\s]+)/i);
            if (match) return decodeURIComponent(match[1]);
        }
        return undefined;
    }
}
