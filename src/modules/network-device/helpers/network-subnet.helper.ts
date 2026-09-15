import * as os from 'node:os';

import { Injectable } from '@nestjs/common';

import { ONVIF_GLOBAL_BROADCAST_IP, ONVIF_MULTICAST_IP } from '../constants';

@Injectable()
export class NetworkSubnetHelper {
    static detectLocalSubnet(): string | null {
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

    static calculateBroadcastAddress(ip: string, netmask: string): string | null {
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

    static parseSubnetBroadcast(subnet: string): string | null {
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

    static resolveBroadcastAndMulticastTargets(subnet?: string): string[] {
        const targets = new Set<string>([ONVIF_MULTICAST_IP, ONVIF_GLOBAL_BROADCAST_IP]);

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

        if (subnet) {
            const subnetBroadcast = this.parseSubnetBroadcast(subnet);
            if (subnetBroadcast) {
                targets.add(subnetBroadcast);
            }
        }

        return Array.from(targets);
    }
}
