import { ConsoleLogger, HttpException, Injectable } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import chalk from 'chalk';

const levelColors: Record<string, string> = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey',
};

const contentColor: Record<string, chalk.Chalk> = {
    level: chalk.hex('#FF5733'), // Orange red
    timestamp: chalk.hex('#2980B9'), // Blue
    contextName: chalk.hex('#FF69B4'), // Pink
    stack: chalk.hex('#8E44AD'), // Purple
    rest: chalk.hex('#F1C40F'), // Yellow
};

winston.addColors(levelColors);

@Injectable()
export class LoggerService extends ConsoleLogger {
    private readonly logger: winston.Logger;

    constructor(contextName?: string) {
        super();

        this.logger = winston.createLogger(this.getWinstonConfig(contextName ?? 'UnknownService'));

        if (process.env.NODE_ENV !== 'production') {
            this.logger.info('Logging initialized at debug level');
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
        this.logger.error(
            typeof context === 'string' ? context : context instanceof HttpException ? JSON.stringify(context.getResponse()) : '',
        );
    }

    warn(message: string): void {
        this.logger.warn(message);
    }

    private getCustomConsoleFormat(contextName: string): winston.Logform.Format {
        return winston.format.combine(
            winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.colorize({ all: true }),
            winston.format.printf((info) => {
                const { timestamp, level, message, stack, ...rest } = info;

                const coloredLevel = contentColor.level(level);
                const coloredTimestamp = contentColor.timestamp(timestamp);
                const coloredContext = contentColor.contextName(contextName);

                let msg = `[${coloredTimestamp}] - [${coloredLevel}]: [${coloredContext}] ${message}`;
                if (stack) {
                    msg += `\n${contentColor.stack(stack)}`;
                }

                const restEntries = Object.entries(rest);
                if (restEntries.length) {
                    msg += ' ' + contentColor.rest(JSON.stringify(Object.fromEntries(restEntries)));
                }

                return msg;
            }),
        );
    }

    private getWinstonConfig(contextName: string): winston.LoggerOptions {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const basePath = `./logs/${nodeEnv}/${contextName}`;

        return {
            exitOnError: false,
            transports: [
                new DailyRotateFile({
                    level: 'debug',
                    filename: `${basePath}/debug-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d',
                    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                }),
                new DailyRotateFile({
                    level: 'info',
                    filename: `${basePath}/info-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d',
                    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                }),
                new DailyRotateFile({
                    level: 'error',
                    filename: `${basePath}/error-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '20m',
                    maxFiles: '30d',
                    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                }),
                new winston.transports.Console({
                    level: 'debug',
                    handleExceptions: true,
                    format: this.getCustomConsoleFormat(contextName),
                }),
            ],
        };
    }
}
