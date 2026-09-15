import { ArpParserHelper } from '../arp-parser.helper';

describe('ArpParserHelper', () => {
    describe('parseArpLine', () => {
        it('should parse valid ARP line on macOS/Linux correctly', () => {
            const line = '? (192.168.1.100) at 00:11:22:33:44:55 on en0 ifscope [ethernet]';
            const result = ArpParserHelper.parseArpLine(line);

            expect(result).toEqual({
                ip: '192.168.1.100',
                mac: '00:11:22:33:44:55',
            });
        });

        it('should normalize MAC with hyphen and lowercase', () => {
            const line = '? (192.168.1.50) at 0-1a-2b-3c-4d-5e [ether] on eth0';
            const result = ArpParserHelper.parseArpLine(line);

            expect(result).toEqual({
                ip: '192.168.1.50',
                mac: '00:1A:2B:3C:4D:5E',
            });
        });

        it('should return null for broadcast MAC ff:ff:ff:ff:ff:ff', () => {
            const line = '? (192.168.1.255) at ff:ff:ff:ff:ff:ff on en0 [ethernet]';
            const result = ArpParserHelper.parseArpLine(line);

            expect(result).toBeNull();
        });

        it('should return null for invalid lines without IP/MAC', () => {
            expect(ArpParserHelper.parseArpLine('Interface: 192.168.1.1 --- 0x2')).toBeNull();
            expect(ArpParserHelper.parseArpLine('')).toBeNull();
        });
    });

    describe('normalizeMacAddress', () => {
        it('should pad single digits and convert to uppercase colon-separated', () => {
            expect(ArpParserHelper.normalizeMacAddress('0:a:2b:3:4d:5e')).toBe('00:0A:2B:03:4D:5E');
            expect(ArpParserHelper.normalizeMacAddress('00-11-22-33-44-55')).toBe('00:11:22:33:44:55');
        });
    });
});
