import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

import { AppService } from './app.service';
import { GetRestApi } from './decorators';
import { LoggerService } from './shared/services/logger.service';

@Controller('/')
@ApiTags('Hello World')
export class AppController {
    private readonly loggerService: LoggerService = new LoggerService(AppController.name);

    constructor(
        private readonly appService: AppService,
        private readonly health: HealthCheckService,
        private readonly db: TypeOrmHealthIndicator,
    ) {}

    @GetRestApi({ path: 'health/live', summary: 'Health check live' })
    live(): { status: string } {
        return { status: 'ok' };
    }

    @GetRestApi({ path: 'health', summary: 'Health check full' })
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.db.pingCheck('database'),

            () => ({
                memory: {
                    status: 'up',
                    rss: process.memoryUsage().rss,
                    heap: process.memoryUsage().heapUsed,
                },
            }),
        ]);
    }

    @GetRestApi({ summary: 'Get Hello' })
    getHello(): string {
        this.loggerService.info('Hello World!');
        return this.appService.getHello();
    }
}
