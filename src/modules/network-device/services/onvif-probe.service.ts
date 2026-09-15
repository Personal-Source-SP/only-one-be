import * as crypto from 'node:crypto';
import * as dgram from 'node:dgram';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import { createOnvifProbeMessage, DEFAULT_ONVIF_PROBE_TIMEOUT_MS, ONVIF_MULTICAST_IP, ONVIF_MULTICAST_PORT } from '../constants';
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
            const probeMessage = createOnvifProbeMessage(crypto.randomUUID());

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

                    const device = new NetworkDeviceDto({
                        ipAddress: ip,
                        deviceType: NetworkDeviceType.CAMERA,
                        vendor: this.extractVendorFromScopes(metadata.scopes),
                        model: this.extractModelFromScopes(metadata.scopes),
                        openPorts,
                        onvifMetadata: metadata,
                        isOnline: true,
                        lastSeenAt: new Date(),
                    });

                    discoveredMap.set(ip, device);
                    this.loggerService.log(`ONVIF Camera discovered: ${ip} (${device.vendor || 'Unknown Vendor'})`);
                } catch (err) {
                    this.loggerService.error(`Failed to parse ONVIF message from ${rinfo.address}: ${err.message}`);
                }
            });

            client.bind(0, () => {
                try {
                    client.setBroadcast(true);
                    client.setMulticastTTL(128);
                    const buffer = Buffer.from(probeMessage, 'utf8');
                    client.send(buffer, 0, buffer.length, ONVIF_MULTICAST_PORT, ONVIF_MULTICAST_IP, (err) => {
                        if (err) {
                            this.loggerService.error(`Failed to send ONVIF probe packet: ${err.message}`);
                            cleanup();
                        }
                    });
                } catch (e) {
                    this.loggerService.error(`Error configuring UDP socket: ${e.message}`);
                    cleanup();
                }
            });
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
