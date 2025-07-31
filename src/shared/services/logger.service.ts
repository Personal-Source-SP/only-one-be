import { ConsoleLogger, HttpException, Injectable } from '@nestjs/common';
import * as winston from 'winston';

import { AppConfigService } from './app-config.service';

@Injectable()
export class LoggerService extends ConsoleLogger {
    private readonly _logger: winston.Logger;

    constructor(private readonly _configService: AppConfigService) {
        super(LoggerService.name);
        this._logger = winston.createLogger(this._configService.winstonConfig);
        if (_configService.nodeEnv !== 'production') {
            this._logger.debug('Logging initialized at debug level');
        }
    }
    log(message: string): void {
        this._logger.info(message);
    }
    info(message: string): void {
        this._logger.info(message);
    }
    debug(message: string): void {
        this._logger.debug(message);
    }
    error(context?: string | HttpException): void {
        this._logger.error(context);
    }
    warn(message: string): void {
        this._logger.warn(message);
    }
}
