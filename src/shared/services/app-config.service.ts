import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

import { ISwaggerConfigInterface } from '../../interfaces/swagger-config.interface';
import { IJwtConfig } from '../interfaces/app-config.interface';
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

    get(key: string): string {
        return process.env[key];
    }

    getNumber(key: string): number {
        return Number(this.get(key));
    }

    getBoolean(key: string): boolean {
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

    get jwtConfig(): IJwtConfig {
        return {
            appSecret: this.get('APP_SECRET'),
            expire: this.get('JWT_EXPIRE') || '24h',
            refreshExpire: this.get('JWT_REFRESH_EXPIRE') || '30d',
        };
    }

    get redisConfig() {
        return {
            host: this.get('REDIS_HOST'),
            port: this.getNumber('REDIS_PORT'),
            password: this.get('REDIS_PASSWORD'),
        };
    }

    get scraperConfig() {
        return {
            url: this.get('SCRAPER_URL'),
            secretKey: this.get('SCRAPER_SECRET_KEY'),
        };
    }

    get scheduleConfig(): {
        enabled: boolean;
        removedOnCompleted: boolean;
    } {
        return {
            enabled: this.getBoolean('SCHEDULE_ENABLED'),
            removedOnCompleted: this.getBoolean('SCHEDULE_JOB_QUEUE_REMOVED_ON_COMPLETED'),
        };
    }
}
