import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';

import { LoggerService } from '../../../shared/services/logger.service';
import { LOCK_TTL_SECONDS, REDLOCK_CONFIG, SCRAPING_SCHEDULE_LOCK } from '../constants/redlock.constant';

@Injectable()
export class RedisLockService {
    private redlock: Redlock;
    private readonly loggerService: LoggerService = new LoggerService(RedisLockService.name);

    constructor(private readonly redisClient: Redis) {
        const compatibleClient = this.redisClient as unknown as Redis;
        this.redlock = new Redlock([compatibleClient], REDLOCK_CONFIG);
    }

    getLockKey(scheduleId: string): string {
        return `${SCRAPING_SCHEDULE_LOCK}:${scheduleId}`;
    }

    async acquireLock(scheduleId: string): Promise<any | null> {
        if (!scheduleId) return null;

        const lockKey = this.getLockKey(scheduleId);

        try {
            const lock = await this.redlock.acquire([lockKey], LOCK_TTL_SECONDS * 1000);
            return lock;
        } catch (error) {
            return null;
        }
    }

    async releaseLock(lock: Lock | null): Promise<void> {
        if (!lock) return;

        try {
            await this.redlock.release(lock);
            this.loggerService.log(`Lock released successfully`);
        } catch (error) {
            this.loggerService.warn(`Error releasing lock: ${error.message}`);
        }
    }
}
