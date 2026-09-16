import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../../shared/services/logger.service';
import { NetworkDeviceDto } from '../../dtos';
import { NetworkDeviceType } from '../../enums';
import { ArpParserHelper, OuiLookupHelper } from '../../helpers';
import { INetworkDeviceApproachService, INetworkScanOptions } from '../../interfaces';

const execAsync = promisify(exec);

@Injectable()
export class NetworkDiscoveryApproachService implements INetworkDeviceApproachService {
    constructor(private readonly loggerService: LoggerService) {}

    async scan(options: INetworkScanOptions = {}): Promise<NetworkDeviceDto[]> {
        const devices: NetworkDeviceDto[] = [];

        try {
            const { stdout } = await execAsync('arp -a');
            const lines = stdout.split('\n');

            for (const line of lines) {
                const parsed = ArpParserHelper.parseArpLine(line);
                if (parsed) {
                    const { vendor, defaultType } = OuiLookupHelper.lookupVendor(parsed.mac);

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
        } catch (error: any) {
            this.loggerService.error(`Error reading ARP table: ${error.message}`);
        }

        return devices;
    }
}
