export const DEFAULT_PROTOCOL_AUTH_TIMEOUT_MS = 1500;
export const DEFAULT_SNAPSHOT_TIMEOUT_MS = 2000;
export const DEFAULT_RTSP_PORT = 554;
export const DEFAULT_RTSP_PATH = '/live/ch0';
export const DEFAULT_SNAPSHOT_CONTENT_TYPE = 'image/jpeg';
export const DEFAULT_CAMERA_MODEL = 'IP Camera';
export const DEFAULT_CAMERA_FIRMWARE_VERSION = '1.0.0';
export const DEFAULT_CAMERA_MANUFACTURER = 'Generic Camera';
export const ONVIF_MULTICAST_TTL = 128;

export const CAMERA_AUTH_PROBE_PATHS: readonly string[] = [
    '/onvif/device_service',
    '/cgi-bin/snapshot.cgi',
    '/',
];

export const CAMERA_SNAPSHOT_PATHS: readonly string[] = [
    '/onvif-http/snapshot',
    '/cgi-bin/snapshot.cgi',
    '/snap.jpg',
    '/image.jpg',
];
