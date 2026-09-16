import { IDeviceCredential } from '../interfaces';

// --- ONVIF WS-Discovery Probe Constants ---
export const ONVIF_MULTICAST_IP = '239.255.255.250';
export const ONVIF_GLOBAL_BROADCAST_IP = '255.255.255.255';
export const ONVIF_MULTICAST_PORT = 3702;
export const ONVIF_MULTICAST_TTL = 128;
export const DEFAULT_ONVIF_PROBE_TIMEOUT_MS = 3000;

export const createOnvifProbeMessage = (messageId: string): string => `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <s:Header>
    <wsa:MessageID>uuid:${messageId}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005/04/discovery</wsa:To>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </s:Header>
  <s:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter tds:Device</d:Types>
    </d:Probe>
  </s:Body>
</s:Envelope>`;

export const createUniversalProbeMessage = (messageId: string): string => `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
  <s:Header>
    <wsa:MessageID>uuid:${messageId}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005/04/discovery</wsa:To>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </s:Header>
  <s:Body>
    <d:Probe/>
  </s:Body>
</s:Envelope>`;

// --- Camera Protocol Auth & Snapshot Configuration ---
export const DEFAULT_PROTOCOL_AUTH_TIMEOUT_MS = 1500;
export const DEFAULT_SNAPSHOT_TIMEOUT_MS = 2000;
export const DEFAULT_RTSP_PORT = 554;
export const DEFAULT_RTSP_PATH = '/live/ch0';
export const DEFAULT_SNAPSHOT_CONTENT_TYPE = 'image/jpeg';
export const DEFAULT_CAMERA_MODEL = 'IP Camera';
export const DEFAULT_CAMERA_FIRMWARE_VERSION = '1.0.0';
export const DEFAULT_CAMERA_MANUFACTURER = 'Generic Camera';

export const CAMERA_AUTH_PROBE_PATHS: readonly string[] = ['/onvif/device_service', '/cgi-bin/snapshot.cgi', '/'];

export const CAMERA_SNAPSHOT_PATHS: readonly string[] = ['/onvif-http/snapshot', '/cgi-bin/snapshot.cgi', '/snap.jpg', '/image.jpg'];

// --- Default Camera Credentials for Auth Probing ---
export const DEFAULT_CAMERA_CREDENTIALS: IDeviceCredential[] = [
    { username: 'admin', password: '' },
    { username: 'admin', password: 'admin' },
    { username: 'admin', password: 'password' },
    { username: 'admin', password: '12345' },
    { username: 'admin', password: '123456' },
    { username: 'admin', password: 'admin123' },
    { username: 'admin', password: 'admin1234' },
    { username: 'admin', password: '123456aA' },
    { username: 'root', password: '' },
    { username: 'root', password: 'root' },
    { username: 'root', password: 'pass' },
    { username: 'root', password: 'password' },
    { username: 'root', password: '12345' },
    { username: 'root', password: '123456' },
    { username: 'service', password: 'service' },
    { username: 'user', password: 'user' },
];
