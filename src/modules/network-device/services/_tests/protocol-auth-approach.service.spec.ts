import * as assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { DEFAULT_CAMERA_CREDENTIALS } from '../../constants';
import { NetworkDeviceApproachEnum } from '../../enums';
import { ProtocolAuthApproachService } from '../network-device-approach';

describe('ProtocolAuthApproachService (Protocol Auth & Camera Approach)', () => {
    let service: ProtocolAuthApproachService;
    const mockLogger: any = { log: () => {}, error: () => {}, warn: () => {} };

    beforeEach(() => {
        service = new ProtocolAuthApproachService(mockLogger);
    });

    it('should have default credentials configured', () => {
        assert.ok(DEFAULT_CAMERA_CREDENTIALS.length > 0);
        assert.ok(DEFAULT_CAMERA_CREDENTIALS.some((c) => c.username === 'admin' && c.password === '123456'));
    });

    it('should return failure if verifying credentials without target IP', async () => {
        const res = await service.verifyCameraCredentials({});
        assert.strictEqual(res.isSuccess, false);
        assert.strictEqual(res.approach, NetworkDeviceApproachEnum.PROTOCOL_AUTH);
        assert.ok(res.errorMessage?.includes('Target IP'));
    });

    it('should generate valid stream URI for camera target', async () => {
        const streamUri = await service.fetchStreamUri({ ip: '192.168.1.50' }, { username: 'admin', password: 'password123' });
        assert.strictEqual(streamUri, 'rtsp://admin:password123@192.168.1.50:554/live/ch0');
    });
});
