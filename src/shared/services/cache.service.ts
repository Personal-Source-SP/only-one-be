import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { AppConfigService } from './app-config.service';
import { LoggerService } from './logger.service';

export const CACHE_KEY_DELIMITER = ':';

@Injectable()
export class CacheService {
    private readonly prefix: string;

    constructor(
        private readonly redisClient: Redis,
        private readonly configService: AppConfigService,
        private readonly loggerService: LoggerService,
    ) {
        this.prefix = this.configService.get('REDIS_PREFIX') || 'only_one';
    }

    get client(): Redis {
        return this.redisClient;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const raw = await this.redisClient.get(this.getFullKey(key));
            if (!raw) return null;

            try {
                return JSON.parse(raw) as T;
            } catch {
                return raw as unknown as T;
            }
        } catch (error) {
            this.loggerService.error(`Error getting cache key ${key}: ${(error as Error).message}`);
            return null;
        }
    }

    async set(key: string, value: any, ttlSeconds = 0): Promise<void> {
        try {
            const fullKey = this.getFullKey(key);
            const payload = typeof value === 'string' ? value : JSON.stringify(value);

            if (ttlSeconds > 0) {
                await this.redisClient.set(fullKey, payload, 'EX', ttlSeconds);
            } else {
                await this.redisClient.set(fullKey, payload);
            }
        } catch (error) {
            this.loggerService.error(`Error setting cache key ${key}: ${(error as Error).message}`);
        }
    }

    async setIfNotExists(key: string, value: any, ttlSeconds = 0): Promise<boolean> {
        try {
            const fullKey = this.getFullKey(key);
            const payload = typeof value === 'string' ? value : JSON.stringify(value);

            const result =
                ttlSeconds > 0
                    ? await this.redisClient.set(fullKey, payload, 'EX', ttlSeconds, 'NX')
                    : await this.redisClient.set(fullKey, payload, 'NX');

            return result === 'OK';
        } catch (error) {
            this.loggerService.error(`Error setting if not exists cache key ${key}: ${(error as Error).message}`);
            return false;
        }
    }

    async getAndDelete<T>(key: string): Promise<T | null> {
        try {
            const raw = await this.redisClient.getdel(this.getFullKey(key));
            if (!raw) return null;

            try {
                return JSON.parse(raw) as T;
            } catch {
                return raw as unknown as T;
            }
        } catch (error) {
            this.loggerService.error(`Error getAndDelete cache key ${key}: ${(error as Error).message}`);
            return null;
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const result = await this.redisClient.del(this.getFullKey(key));
            return result > 0;
        } catch (error) {
            this.loggerService.error(`Error deleting cache key ${key}: ${(error as Error).message}`);
            return false;
        }
    }

    async deleteByPrefix(prefix: string, ...appends: string[]): Promise<number> {
        try {
            const patternParts = [this.prefix, prefix, ...appends, '*'];
            const pattern = patternParts.join(CACHE_KEY_DELIMITER);

            let cursor = '0';
            let totalDeleted = 0;

            do {
                const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;

                if (keys.length > 0) {
                    const deleted = await this.redisClient.unlink(...keys);
                    totalDeleted += deleted;
                }
            } while (cursor !== '0');

            return totalDeleted;
        } catch (error) {
            this.loggerService.error(`Error deleting by prefix ${prefix}: ${(error as Error).message}`);
            return 0;
        }
    }

    async releaseLock(key: string, token: string): Promise<boolean> {
        const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;

        try {
            const result = await this.redisClient.eval(luaScript, 1, this.getFullKey(key), token);
            return result === 1;
        } catch (error) {
            this.loggerService.error(`Error releasing lock ${key}: ${(error as Error).message}`);
            return false;
        }
    }

    private getFullKey(key: string): string {
        return `${this.prefix}${CACHE_KEY_DELIMITER}${key}`;
    }
}
