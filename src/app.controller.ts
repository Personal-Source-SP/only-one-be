import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';

import { AppService } from './app.service';
import { LoggerService } from './shared/services/logger.service';

@Controller('/')
@ApiTags('helloworld')
export class AppController {
    constructor(
        private readonly _appService: AppService,
        private readonly _logger: LoggerService,
    ) {}

    @Get('/')
    @HttpCode(HttpStatus.OK)
    getHello(): string {
        this._logger.info('Hello World!');
        return this._appService.getHello();
    }

    @Get('healthcheck')
    @HealthCheck()
    healthCheck() {
        return { data: true };
    }
}
