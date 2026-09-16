import * as assert from 'node:assert';
import { describe, it } from 'node:test';

import { OuiLookupHelper } from '../oui-lookup.helper';

describe('OuiLookupHelper', () => {
    describe('lookupVendor', () => {
        it('should return empty object if macAddress is missing or null/empty', () => {
            assert.deepStrictEqual(OuiLookupHelper.lookupVendor(), {});
            assert.deepStrictEqual(OuiLookupHelper.lookupVendor(null as any), {});
            assert.deepStrictEqual(OuiLookupHelper.lookupVendor(''), {});
        });

        it('should return empty object if macAddress is too short', () => {
            assert.deepStrictEqual(OuiLookupHelper.lookupVendor('00:11'), {});
        });

        it('should return vendor and defaultType for known OUI prefix', () => {
            const result = OuiLookupHelper.lookupVendor('C0:56:E3:11:22:33');
            assert.ok(result.vendor);
        });

        it('should handle mac address with hyphens and lowercase', () => {
            const result = OuiLookupHelper.lookupVendor('c0-56-e3-11-22-33');
            assert.ok(result.vendor);
        });

        it('should return empty object for unknown OUI prefix', () => {
            const result = OuiLookupHelper.lookupVendor('99:99:99:99:99:99');
            assert.deepStrictEqual(result, {});
        });
    });
});
