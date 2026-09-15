import { NetworkDeviceType } from '../enums';

export interface IOuiEntry {
    vendor: string;
    defaultType?: NetworkDeviceType;
}

export interface IOuiLookupResult {
    vendor?: string;
    defaultType?: NetworkDeviceType;
}
