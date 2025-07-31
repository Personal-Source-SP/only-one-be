import { ConsoleLogger, HttpException, Injectable } from '@nestjs/common';
import * as winston from 'winston';

import { AppConfigService } from './app-config.service';

@Injectable()
export class LoggerService extends ConsoleLogger {
    private readonly logger: winston.Logger;

    constructor(private readonly configService: AppConfigService) {
        super(LoggerService.name);
        this.logger = winston.createLogger(this.configService.winstonConfig);

        if (configService.nodeEnv !== 'production') {
            this.logger.debug('Logging initialized at debug level');
        }
    }

    log(message: string): void {
        this.logger.info(message);
    }

    info(message: string): void {
        this.logger.info(message);
    }

    debug(message: string): void {
        this.logger.debug(message);
    }

    error(context?: string | HttpException): void {
        this.logger.error(context);
    }

    warn(message: string): void {
        this.logger.warn(message);
    }
}
