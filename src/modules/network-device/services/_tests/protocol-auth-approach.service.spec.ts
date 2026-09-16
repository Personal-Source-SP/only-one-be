import * as assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { DEFAULT_CAMERA_CREDENTIALS, NetworkDeviceError } from '../../constants';
import { NetworkDeviceApproachEnum } from '../../enums';
import { ProtocolAuthApproachService } from '../network-device-approach';

describe('ProtocolAuthApproachService (Protocol Auth & Camera Approach)', () => {
    let service: ProtocolAuthApproachService;
    const mockLogger: any = { log: () => {}, error: () => {}, warn: () => {}, debug: () => {} };
    let mockBaseHttpService: any;

    beforeEach(() => {
        mockBaseHttpService = {
            get: async () => ({
                status: 200,
                data: Buffer.from('fake-image-bytes'),
                headers: { 'content-type': 'image/jpeg' },
            }),
        };
        service = new ProtocolAuthApproachService(mockLogger, mockBaseHttpService);
    });

    it('should have default credentials configured', () => {
        assert.ok(DEFAULT_CAMERA_CREDENTIALS.length > 0);
        assert.ok(DEFAULT_CAMERA_CREDENTIALS.some((c) => c.username === 'admin' && c.password === '123456'));
    });

    it('should return failure if verifying credentials without target IP', async () => {
        const res = await service.verifyCameraCredentials({});
        assert.strictEqual(res.isSuccess, false);
        assert.strictEqual(res.approach, NetworkDeviceApproachEnum.PROTOCOL_AUTH);
        assert.strictEqual(res.errorMessage, NetworkDeviceError.TargetIpRequired.message);
    });

    it('should authenticate successfully and fetch snapshot + stream URI', async () => {
        const res = await service.verifyCameraCredentials({ ip: '192.168.1.50' }, [
            { username: 'admin', password: 'password123' },
        ]);
        assert.strictEqual(res.isSuccess, true);
        assert.strictEqual(res.matchedCredential?.username, 'admin');
        assert.ok(res.data?.snapshotUri?.startsWith('data:image/jpeg;base64,'));
        assert.strictEqual(res.data?.rtspStreamUri, 'rtsp://admin:password123@192.168.1.50:554/live/ch0');
        assert.strictEqual(res.data?.liveViewSupported, true);
    });

    it('should return failure if all credentials fail authentication', async () => {
        mockBaseHttpService.get = async () => {
            throw new Error('Connection refused');
        };
        const res = await service.verifyCameraCredentials({ ip: '192.168.1.50' }, [
            { username: 'admin', password: 'wrongpassword' },
        ]);
        assert.strictEqual(res.isSuccess, false);
        assert.strictEqual(res.errorMessage, NetworkDeviceError.CameraAuthFailed.message);
    });

    it('should generate valid stream URI for camera target', async () => {
        const streamUri = await service.fetchStreamUri({ ip: '192.168.1.50' }, { username: 'admin', password: 'password123' });
        assert.strictEqual(streamUri, 'rtsp://admin:password123@192.168.1.50:554/live/ch0');
    });

    it('should fetch device info with default metadata', async () => {
        const info = await service.fetchDeviceInfo({ ip: '192.168.1.50' });
        assert.strictEqual(info?.model, 'IP Camera');
        assert.strictEqual(info?.firmwareVersion, '1.0.0');
        assert.strictEqual(info?.manufacturer, 'Generic Camera');
    });
});
