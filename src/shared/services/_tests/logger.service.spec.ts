import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';

import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { LoggerService } from '../logger.service';

describe('LoggerService', () => {
    const originalEnv = process.env.LOG_FILE_ENABLE;

    after(() => {
        if (originalEnv !== undefined) {
            process.env.LOG_FILE_ENABLE = originalEnv;
        } else {
            delete process.env.LOG_FILE_ENABLE;
        }
    });

    it('should only include Console transport when LOG_FILE_ENABLE is not true', () => {
        process.env.LOG_FILE_ENABLE = 'false';
        const service = new LoggerService('TestContext');
        const logger = (service as any).logger as winston.Logger;

        assert.strictEqual(logger.transports.length, 1);
        assert.ok(logger.transports[0] instanceof winston.transports.Console);
    });

    it('should include DailyRotateFile transports when LOG_FILE_ENABLE is true', () => {
        process.env.LOG_FILE_ENABLE = 'true';
        const service = new LoggerService('TestContext');
        const logger = (service as any).logger as winston.Logger;

        assert.strictEqual(logger.transports.length, 3);
        const rotateTransports = logger.transports.filter((t) => t instanceof DailyRotateFile);
        assert.strictEqual(rotateTransports.length, 2);
    });
});
