import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientOptions } from 'redis';
import { ServerOptions } from 'socket.io';
import { LoggerService } from '../../../shared/services/logger.service';

export class RedisIoAdapter extends IoAdapter {
    private adapterConstructor: ReturnType<typeof createAdapter>;
    private readonly loggerService: LoggerService = new LoggerService(RedisIoAdapter.name);

    async connectToRedis(options: RedisClientOptions): Promise<void> {
        const pubClient = createClient(options);
        const subClient = pubClient.duplicate();

        // eslint-disable-next-line no-undef
        await Promise.all([pubClient.connect(), subClient.connect()]);

        this.adapterConstructor = createAdapter(pubClient, subClient);
        this.loggerService.log('Connected to redis');
    }

    createIOServer(port: number, options?: ServerOptions): any {
        const server = super.createIOServer(port, options);
        server.adapter(this.adapterConstructor);
        return server;
    }
}
