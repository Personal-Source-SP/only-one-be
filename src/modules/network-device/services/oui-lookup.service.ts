import { Injectable } from '@nestjs/common';

import { OUI_DATABASE } from '../constants';
import { IOuiLookupResult } from '../interfaces';

@Injectable()
export class OuiLookupService {
    lookupVendor(macAddress?: string | null): IOuiLookupResult {
        if (!macAddress) return {};

        const normalized = macAddress.toUpperCase().replace(/[:-]/g, '');
        if (normalized.length < 6) return {};

        const prefix = `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}:${normalized.slice(4, 6)}`;
        const match = OUI_DATABASE[prefix];

        if (match) {
            return {
                vendor: match.vendor,
                defaultType: match.defaultType,
            };
        }

        return {};
    }
}
