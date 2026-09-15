import { NetworkSubnetHelper } from '../network-subnet.helper';

describe('NetworkSubnetHelper', () => {
    describe('calculateBroadcastAddress', () => {
        it('should calculate broadcast IP correctly for /24 netmask', () => {
            const bcast = NetworkSubnetHelper.calculateBroadcastAddress('192.168.1.50', '255.255.255.0');
            expect(bcast).toBe('192.168.1.255');
        });

        it('should calculate broadcast IP correctly for /16 netmask', () => {
            const bcast = NetworkSubnetHelper.calculateBroadcastAddress('172.16.5.10', '255.255.0.0');
            expect(bcast).toBe('172.16.255.255');
        });

        it('should return null on invalid IP or netmask', () => {
            expect(NetworkSubnetHelper.calculateBroadcastAddress('invalid', '255.255.255.0')).toBeNull();
            expect(NetworkSubnetHelper.calculateBroadcastAddress('192.168.1.1', 'invalid')).toBeNull();
        });
    });

    describe('parseSubnetBroadcast', () => {
        it('should parse CIDR notation', () => {
            expect(NetworkSubnetHelper.parseSubnetBroadcast('192.168.2.0/24')).toBe('192.168.2.255');
            expect(NetworkSubnetHelper.parseSubnetBroadcast('10.0.0.0/8')).toBe('10.255.255.255');
        });

        it('should parse 4-part base IP by returning .255', () => {
            expect(NetworkSubnetHelper.parseSubnetBroadcast('192.168.5.0')).toBe('192.168.5.255');
        });

        it('should return null for invalid subnet formats', () => {
            expect(NetworkSubnetHelper.parseSubnetBroadcast('invalid-subnet')).toBeNull();
            expect(NetworkSubnetHelper.parseSubnetBroadcast('192.168.1.0/40')).toBeNull();
        });
    });

    describe('resolveBroadcastAndMulticastTargets', () => {
        it('should always include default multicast and global broadcast', () => {
            const targets = NetworkSubnetHelper.resolveBroadcastAndMulticastTargets('192.168.1.0/24');
            expect(targets).toContain('239.255.255.250');
            expect(targets).toContain('255.255.255.255');
            expect(targets).toContain('192.168.1.255');
        });
    });
});
