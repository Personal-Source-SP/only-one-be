import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import { NetworkDeviceDto } from '../dtos';
import { NetworkDeviceType } from '../enums';
import { IArpEntry, IProbeService } from '../interfaces';
import { OuiLookupService } from './oui-lookup.service';

const execAsync = promisify(exec);

@Injectable()
export class ArpScanService implements IProbeService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly ouiLookupService: OuiLookupService,
    ) {}

    async scan(): Promise<NetworkDeviceDto[]> {
        return this.probe();
    }

    async probe(): Promise<NetworkDeviceDto[]> {
        const devices: NetworkDeviceDto[] = [];

        try {
            const { stdout } = await execAsync('arp -a');
            const lines = stdout.split('\n');

            for (const line of lines) {
                const parsed = this.parseArpLine(line);
                if (parsed) {
                    const { vendor, defaultType } = this.ouiLookupService.lookupVendor(parsed.mac);
                    devices.push(
                        new NetworkDeviceDto({
                            openPorts: [],
                            isOnline: true,
                            ipAddress: parsed.ip,
                            macAddress: parsed.mac,
                            lastSeenAt: new Date(),
                            vendor: vendor || null,
                            deviceType: defaultType || NetworkDeviceType.UNKNOWN,
                        }),
                    );
                }
            }
        } catch (error) {
            this.loggerService.error(`Error reading ARP table: ${error.message}`);
        }

        return devices;
    }

    private parseArpLine(line: string): IArpEntry | null {
        // macOS format: ? (192.168.1.1) at 34:2c:c4:12:34:56 on en0 ifscope [ethernet]
        // Linux format: ? (192.168.1.1) at 34:2c:c4:12:34:56 [ether] on eth0
        const ipMatch = line.match(/\((([0-9]{1,3}\.){3}[0-9]{1,3})\)/);
        const macMatch = line.match(
            /([0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2})/,
        );

        if (ipMatch && macMatch && !macMatch[1].toLowerCase().includes('ff:ff:ff:ff:ff:ff')) {
            const normalizedMac = macMatch[1]
                .split(/[:-]/)
                .map((part) => part.padStart(2, '0').toUpperCase())
                .join(':');

            return {
                ip: ipMatch[1],
                mac: normalizedMac,
            };
        }

        return null;
    }
}
