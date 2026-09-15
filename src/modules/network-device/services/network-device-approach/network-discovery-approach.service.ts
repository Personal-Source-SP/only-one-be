import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../../shared/services/logger.service';
import { NetworkDeviceDto } from '../../dtos';
import { NetworkDeviceApproachEnum, NetworkDeviceType } from '../../enums';
import { ArpParserHelper } from '../../helpers';
import { INetworkDeviceApproachResult, INetworkDeviceApproachService, INetworkDeviceTarget, IProbeService } from '../../interfaces';
import { OuiLookupService } from '../oui-lookup.service';

const execAsync = promisify(exec);

@Injectable()
export class NetworkDiscoveryApproachService implements IProbeService, INetworkDeviceApproachService<any, NetworkDeviceDto[]> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly ouiLookupService: OuiLookupService,
    ) {}

    async execute(target: INetworkDeviceTarget = {}, _options?: any): Promise<INetworkDeviceApproachResult<NetworkDeviceDto[]>> {
        const startTime = Date.now();
        try {
            const devices = await this.scan();
            const filteredDevices = target.ip ? devices.filter((d) => d.ipAddress === target.ip) : devices;

            return {
                isSuccess: true,
                approach: NetworkDeviceApproachEnum.NETWORK_DISCOVERY,
                target,
                data: filteredDevices,
                responseTimeMs: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                approach: NetworkDeviceApproachEnum.NETWORK_DISCOVERY,
                target,
                data: [],
                responseTimeMs: Date.now() - startTime,
                errorMessage: error.message || 'Lỗi trong quá trình quét Network Discovery',
            };
        }
    }

    async scan(): Promise<NetworkDeviceDto[]> {
        return this.probe();
    }

    async probe(): Promise<NetworkDeviceDto[]> {
        const devices: NetworkDeviceDto[] = [];

        try {
            const { stdout } = await execAsync('arp -a');
            const lines = stdout.split('\n');

            for (const line of lines) {
                const parsed = ArpParserHelper.parseArpLine(line);
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
        } catch (error: any) {
            this.loggerService.error(`Error reading ARP table: ${error.message}`);
        }

        return devices;
    }
}
