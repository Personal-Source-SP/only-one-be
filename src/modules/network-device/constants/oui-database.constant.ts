import { NetworkDeviceType } from '../enums';
import { IOuiEntry } from '../interfaces';

export const OUI_DATABASE: Record<string, IOuiEntry> = {
    // Hikvision & EZVIZ
    'C0:56:E3': { vendor: 'Hikvision', defaultType: NetworkDeviceType.CAMERA },
    '44:19:B6': { vendor: 'Hikvision', defaultType: NetworkDeviceType.CAMERA },
    'BC:5E:CD': { vendor: 'Hikvision', defaultType: NetworkDeviceType.CAMERA },
    '80:E0:1D': { vendor: 'Hikvision', defaultType: NetworkDeviceType.CAMERA },
    '28:57:BE': { vendor: 'Hikvision', defaultType: NetworkDeviceType.CAMERA },
    '58:03:FB': { vendor: 'EZVIZ', defaultType: NetworkDeviceType.CAMERA },
    '18:68:CB': { vendor: 'EZVIZ', defaultType: NetworkDeviceType.CAMERA },

    // Dahua & IMOU
    '3C:EF:8C': { vendor: 'Dahua', defaultType: NetworkDeviceType.CAMERA },
    '4C:11:BF': { vendor: 'Dahua', defaultType: NetworkDeviceType.CAMERA },
    'E0:50:8B': { vendor: 'Dahua', defaultType: NetworkDeviceType.CAMERA },
    '90:02:A9': { vendor: 'Dahua', defaultType: NetworkDeviceType.CAMERA },
    'B0:C5:54': { vendor: 'IMOU', defaultType: NetworkDeviceType.CAMERA },
    'A4:DA:32': { vendor: 'IMOU', defaultType: NetworkDeviceType.CAMERA },

    // TP-Link / Tapo / Kasa
    '50:C7:BF': { vendor: 'TP-Link', defaultType: NetworkDeviceType.ROUTER_AP },
    '70:4F:57': { vendor: 'TP-Link', defaultType: NetworkDeviceType.ROUTER_AP },
    'E8:48:B8': { vendor: 'TP-Link', defaultType: NetworkDeviceType.ROUTER_AP },
    '98:48:27': { vendor: 'TP-Link Tapo', defaultType: NetworkDeviceType.CAMERA },

    // Reolink, Uniview, Hanwha
    'EC:71:DB': { vendor: 'Reolink', defaultType: NetworkDeviceType.CAMERA },
    '00:1A:11': { vendor: 'Google / Nest', defaultType: NetworkDeviceType.SMART_IOT },
    '48:EA:63': { vendor: 'Uniview', defaultType: NetworkDeviceType.CAMERA },
    '00:09:18': { vendor: 'Hanwha Techwin', defaultType: NetworkDeviceType.CAMERA },

    // Network Routers & Gateways
    '00:1A:2B': { vendor: 'Cisco', defaultType: NetworkDeviceType.ROUTER_AP },
    'B4:FB:E4': { vendor: 'Ubiquiti', defaultType: NetworkDeviceType.ROUTER_AP },
    '74:83:C2': { vendor: 'Ubiquiti', defaultType: NetworkDeviceType.ROUTER_AP },
    '48:8F:5A': { vendor: 'MikroTik', defaultType: NetworkDeviceType.ROUTER_AP },
    '00:0C:42': { vendor: 'MikroTik', defaultType: NetworkDeviceType.ROUTER_AP },
    'D8:07:B6': { vendor: 'ASUS', defaultType: NetworkDeviceType.ROUTER_AP },

    // Computers / Mobile / IoT Chips
    'F0:18:98': { vendor: 'Apple', defaultType: NetworkDeviceType.COMPUTER_PHONE },
    '3C:06:30': { vendor: 'Apple', defaultType: NetworkDeviceType.COMPUTER_PHONE },
    'AC:BC:32': { vendor: 'Apple', defaultType: NetworkDeviceType.COMPUTER_PHONE },
    '24:4B:FE': { vendor: 'Espressif (ESP32/ESP8266)', defaultType: NetworkDeviceType.SMART_IOT },
    '30:AE:A4': { vendor: 'Espressif', defaultType: NetworkDeviceType.SMART_IOT },
    '84:F3:EB': { vendor: 'Xiaomi', defaultType: NetworkDeviceType.SMART_IOT },
    '50:82:D5': { vendor: 'Xiaomi', defaultType: NetworkDeviceType.SMART_IOT },
    '00:1E:68': { vendor: 'Raspberry Pi', defaultType: NetworkDeviceType.COMPUTER_PHONE },
    'DC:A6:32': { vendor: 'Raspberry Pi', defaultType: NetworkDeviceType.COMPUTER_PHONE },
};
