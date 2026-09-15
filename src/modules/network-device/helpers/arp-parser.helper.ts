import { Injectable } from '@nestjs/common';

import { IArpEntry } from '../interfaces';

@Injectable()
export class ArpParserHelper {
    static parseArpLine(line: string): IArpEntry | null {
        // macOS format: ? (192.168.1.1) at 34:2c:c4:12:34:56 on en0 ifscope [ethernet]
        // Linux format: ? (192.168.1.1) at 34:2c:c4:12:34:56 [ether] on eth0
        const ipMatch = line.match(/\((([0-9]{1,3}\.){3}[0-9]{1,3})\)/);
        const macMatch = line.match(
            /([0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2})/,
        );

        if (ipMatch && macMatch && !macMatch[1].toLowerCase().includes('ff:ff:ff:ff:ff:ff')) {
            return {
                ip: ipMatch[1],
                mac: this.normalizeMacAddress(macMatch[1]),
            };
        }

        return null;
    }

    static normalizeMacAddress(mac: string): string {
        return mac
            .split(/[:-]/)
            .map((part) => part.padStart(2, '0').toUpperCase())
            .join(':');
    }
}
