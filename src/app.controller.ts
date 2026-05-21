import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

import { AppService } from './app.service';
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

    @Get('health/live')
    @HttpCode(HttpStatus.OK)
    live(): { status: string } {
        return { status: 'ok' };
    }

    @Get('health')
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

    @Get()
    @HttpCode(HttpStatus.OK)
    getHello(): string {
        this.loggerService.info('Hello World!');
        return this.appService.getHello();
    }
}
