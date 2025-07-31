import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { ISwaggerConfigInterface } from '../../interfaces/swagger-config.interface';
import { SnakeNamingStrategy } from '../typeorm/strategies/snake-naming.strategy';

@Injectable()
export class AppConfigService {
    constructor() {
        dotenv.config({
            path: `.env`,
        });

        for (const envName of Object.keys(process.env)) {
            process.env[envName] = process.env[envName].replace(/\\n/g, '\n');
        }
        if (this.nodeEnv === 'development') {
            console.info(process.env);
        }
    }

    public get(key: string): string {
        return process.env[key];
    }

    public getNumber(key: string): number {
        return Number(this.get(key));
    }

    public getBoolean(key: string): boolean {
        return Boolean(this.get(key) == 'true');
    }

    get nodeEnv(): string {
        return this.get('NODE_ENV') || 'development';
    }

    get autoMigration(): boolean {
        return this.getBoolean('AUTO_MIGRATION') || false;
    }

    get swaggerConfig(): ISwaggerConfigInterface {
        return {
            path: this.get('SWAGGER_PATH') || '',
            title: this.get('SWAGGER_TITLE') || 'PORTAL API',
            description: this.get('SWAGGER_DESCRIPTION'),
            version: this.get('SWAGGER_VERSION') || '0.0.1',
            scheme: this.get('SWAGGER_SCHEME') === 'https' ? 'https' : 'http',
        };
    }

    get typeOrmPostgreSqlConfig(): TypeOrmModuleOptions {
        let entities = [
            __dirname + '/../../modules/**/*.entity{.ts,.js}',
            __dirname + '/../../common/**/*.entity{.ts,.js}',
            __dirname + '/../../shared/**/*.entity{.ts,.js}',
        ];
        let migrations = [__dirname + '/../../migrations/*{.ts,.js}'];
        const subscribers = [__dirname + '/../../shared/**/*.subscriber{.ts,.js}'];

        if ((module as any).hot) {
            const entityContext = (require as any).context('./../../modules', true, /\.entity\.ts$/);
            entities = entityContext.keys().map((id) => {
                const entityModule = entityContext(id);
                const [entity] = Object.values(entityModule);
                return entity;
            });
            const migrationContext = (require as any).context('./../../migrations', false, /\.ts$/);
            migrations = migrationContext.keys().map((id) => {
                const migrationModule = migrationContext(id);
                const [migration] = Object.values(migrationModule);
                return migration;
            });
        }

        return {
            entities,
            migrations,
            subscribers: [],
            type: 'postgres',
            host: this.get('DATABASE_HOST'),
            port: this.getNumber('DATABASE_PORT'),
            username: this.get('DATABASE_USERNAME'),
            password: this.get('DATABASE_PASSWORD'),
            database: this.get('DATABASE_NAME'),
            extra: {
                ...(this.get('DATABASE_SSL')?.toString() !== 'false'
                    ? {
                          ssl: {
                              rejectUnauthorized: false,
                          },
                      }
                    : {}),
                max: 200,
            },
            poolSize: 200,
            migrationsRun: false,
            logging: this.getBoolean('DATABASE_LOGGING') || false,
            namingStrategy: new SnakeNamingStrategy(),
            migrationsTableName: 'migrations_crawler',
        };
    }

    get winstonConfig(): winston.LoggerOptions {
        return {
            transports: [
                new DailyRotateFile({
                    level: 'debug',
                    filename: `./logs/${this.nodeEnv}/debug-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d',
                    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                }),
                new DailyRotateFile({
                    level: 'info',
                    filename: `./logs/${this.nodeEnv}/info-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d',
                    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                }),
                new DailyRotateFile({
                    level: 'error',
                    filename: `./logs/${this.nodeEnv}/error-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '20m',
                    maxFiles: '30d',
                    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                }),
                new winston.transports.Console({
                    level: 'debug',
                    handleExceptions: true,
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp({
                            format: 'DD-MM-YYYY HH:mm:ss',
                        }),
                        winston.format.simple(),
                    ),
                }),
            ],
            exitOnError: false,
        };
    }

    get jwtConfig() {
        return {
            appSecret: this.get('APP_SECRET'),
            expire: this.get('JWT_EXPIRE') || '24h',
            refreshExpire: this.get('JWT_REFRESH_EXPIRE') || '30d',
        };
    }

    get boxrec() {
        return {
            username: this.get('BOXREC_USERNAME') || '',
            password: this.get('BOXREC_PASSWORD') || '',
            sampleData: this.get('BOXREC_SAMPLE_DATA') === 'true',
            maxGlobalId: this.getNumber('BOXREC_MAX_GLOBAL_ID') || 0,
        };
    }

    get proxyConfig() {
        return {
            scrapingbee: {
                apiKey: this.get('PROXY_SCRAPINGBEE_API') || '',
                maxConcurrencyConnection: this.getNumber('PROXY_SCRAPINGBEE_MAX_CONNECTION') || 5,
                syncStatusInterval: this.getNumber('PROXY_SCRAPINGBEE_SYNC_STATUS_INTERVAL') || 30,
                ownProxy: this.get('PROXY_SCRAPINGBEE_OWN_PROXY') || '',
            },
            maxConcurrencyConnection: this.getNumber('HTTP_PROXY_MAX_CONCURRENCY_CONNECTION') || 5,
            httpProxyServiceUrl: this.get('HTTP_PROXY_SERVICE_URL') || '',
            httpProxyUrlPool: this.get('HTTP_PROXY_URL_POOL') || '',
        };
    }

    get captcahConfig() {
        return {
            secondCaptcha: {
                apiKey: this.get('CAPTCHA_2CAPTCHA_API') || '',
            },
        };
    }

    get queueConfig() {
        return {
            prefix: this.get('QUEUE_PREFIX') || '',
        };
    }

    get workerConfig() {
        return {
            maxErrorLimit: this.getNumber('WORKER_MAX_ERROR_LIMIT') || 10,
        };
    }

    get clusterConfig() {
        return {
            enable: this.getBoolean('NODE_CLUSTER_ENABLE'),
            numberOfProcess: this.getNumber('NODE_CLUSTER_PROCESS'),
        };
    }

    get cronConfig() {
        return {
            cron: this.getNumber('CRON') || 0,
        };
    }

    get awsConfig() {
        return {
            s3: {
                bucket: this.get('AWS_S3_BUCKET'),
                cacheBucket: this.get('AWS_S3_CACHE_BUCKET'),
                accessKey: this.get('AWS_S3_ACCESS_KEY'),
                keySecret: this.get('AWS_S3_KEY_SECRET'),
                region: this.get('AWS_S3_REGION'),
                serverUrl: this.get('AWS_S3_SERVER_URL'),
            },
        };
    }

    get enableSeed() {
        return this.getBoolean('ENABLE_SEED');
    }

    get openaiConfig() {
        return {
            model: this.get('OPENAI_MODEL'),
            apiKey: this.get('OPENAI_API_KEY'),
            baseURL: this.get('OPENAI_BASE_URL'),
        };
    }

    get scraperConfig() {
        return {
            url: this.get('SCRAPER_URL'),
            secretKey: this.get('SCRAPER_SECRET_KEY'),
        };
    }
}
