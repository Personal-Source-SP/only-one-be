import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

import { AppService } from './app.service';
import { LoggerService } from './shared/services/logger.service';

@Controller('/')
@ApiTags('helloworld')
export class AppController {
    constructor(
        private readonly logger: LoggerService,
        private readonly appService: AppService,
        private readonly health: HealthCheckService,
        private readonly db: TypeOrmHealthIndicator,
    ) {}

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
        this.logger.info('Hello World!');
        return this.appService.getHello();
    }
}
