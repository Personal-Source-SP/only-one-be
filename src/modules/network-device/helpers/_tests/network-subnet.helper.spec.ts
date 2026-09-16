import * as assert from 'node:assert';
import { describe, it } from 'node:test';

import { NetworkSubnetHelper } from '../network-subnet.helper';

describe('NetworkSubnetHelper', () => {
    describe('calculateBroadcastAddress', () => {
        it('should calculate broadcast IP correctly for /24 netmask', () => {
            const bcast = NetworkSubnetHelper.calculateBroadcastAddress('192.168.1.50', '255.255.255.0');
            assert.strictEqual(bcast, '192.168.1.255');
        });

        it('should calculate broadcast IP correctly for /16 netmask', () => {
            const bcast = NetworkSubnetHelper.calculateBroadcastAddress('172.16.5.10', '255.255.0.0');
            assert.strictEqual(bcast, '172.16.255.255');
        });

        it('should return null on invalid IP or netmask', () => {
            assert.strictEqual(NetworkSubnetHelper.calculateBroadcastAddress('invalid', '255.255.255.0'), null);
            assert.strictEqual(NetworkSubnetHelper.calculateBroadcastAddress('192.168.1.1', 'invalid'), null);
        });
    });

    describe('parseSubnetBroadcast', () => {
        it('should parse CIDR notation', () => {
            assert.strictEqual(NetworkSubnetHelper.parseSubnetBroadcast('192.168.2.0/24'), '192.168.2.255');
            assert.strictEqual(NetworkSubnetHelper.parseSubnetBroadcast('10.0.0.0/8'), '10.255.255.255');
        });

        it('should parse 4-part base IP by returning .255', () => {
            assert.strictEqual(NetworkSubnetHelper.parseSubnetBroadcast('192.168.5.0'), '192.168.5.255');
        });

        it('should return null for invalid subnet formats', () => {
            assert.strictEqual(NetworkSubnetHelper.parseSubnetBroadcast('invalid-subnet'), null);
            assert.strictEqual(NetworkSubnetHelper.parseSubnetBroadcast('192.168.1.0/40'), null);
        });
    });

    describe('resolveBroadcastAndMulticastTargets', () => {
        it('should always include default multicast and global broadcast', () => {
            const targets = NetworkSubnetHelper.resolveBroadcastAndMulticastTargets('192.168.1.0/24');
            assert.ok(targets.includes('239.255.255.250'));
            assert.ok(targets.includes('255.255.255.255'));
            assert.ok(targets.includes('192.168.1.255'));
        });
    });
});
