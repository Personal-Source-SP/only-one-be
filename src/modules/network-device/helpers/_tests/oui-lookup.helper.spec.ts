import { NetworkDeviceType } from '../../enums';
import { OuiLookupHelper } from '../oui-lookup.helper';

describe('OuiLookupHelper', () => {
    describe('lookupVendor', () => {
        it('should return empty object if macAddress is missing or null/empty', () => {
            expect(OuiLookupHelper.lookupVendor()).toEqual({});
            expect(OuiLookupHelper.lookupVendor(null)).toEqual({});
            expect(OuiLookupHelper.lookupVendor('')).toEqual({});
        });

        it('should return empty object if macAddress is too short', () => {
            expect(OuiLookupHelper.lookupVendor('00:11')).toEqual({});
        });

        it('should return vendor and defaultType for known OUI prefix', () => {
            const result = OuiLookupHelper.lookupVendor('BC:BA:C2:11:22:33');
            expect(result.vendor).toBeDefined();
        });

        it('should handle mac address with hyphens and lowercase', () => {
            const result = OuiLookupHelper.lookupVendor('bc-ba-c2-11-22-33');
            expect(result.vendor).toBeDefined();
        });

        it('should return empty object for unknown OUI prefix', () => {
            const result = OuiLookupHelper.lookupVendor('99:99:99:99:99:99');
            expect(result).toEqual({});
        });
    });
});
