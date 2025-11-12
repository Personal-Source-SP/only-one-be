import 'source-map-support/register';

import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import cors from 'cors';
import { json } from 'express';
import morgan from 'morgan'; // HTTP request logger
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { AppClusterService } from './app-cluster.service';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exception.filter';
import { TransformResponseInterceptor } from './interceptors/transform-response.interceptor';
import { AppConfigService } from './shared/services/app-config.service';
import { LoggerService } from './shared/services/logger.service';
import { SharedModule } from './shared/shared.module';
import { setupSwagger } from './shared/swagger/setup';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), { cors: true });
    app.setGlobalPrefix('api');

    const loggerService = app.select(SharedModule).get(LoggerService);
    app.useLogger(new LoggerService('Main Instance'));
    app.use(
        morgan('combined', {
            stream: {
                write: (message) => {
                    loggerService.log(message);
                },
            },
        }),
    );

    // Validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            exceptionFactory: (errors) => {
                const messages = errors.map((error) => Object.values(error.constraints || {}).join(', '));
                return new BadRequestException(messages);
            },
            validationError: {
                target: false,
                value: false,
            },
        }),
    );

    const configService = app.select(SharedModule).get(AppConfigService);

    // Transform response interceptor
    app.useGlobalInterceptors(new TransformResponseInterceptor());

    // Versioning
    app.enableVersioning({ type: VersioningType.URI });

    // JSON limit
    app.use(json({ limit: configService.get('JSON_LIMIT') || '50mb' }));

    // All exceptions filter
    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    if (['development', 'staging'].includes(configService.nodeEnv)) {
        const document = setupSwagger(app, configService.swaggerConfig);
        app.use('/swagger.json', (_, res) => {
            res.json(document);
        });
    }

    // Cors
    const port = configService.getNumber('PORT') || 3000;
    const host = configService.get('HOST') || '0.0.0.0';
    const origin = configService.get('ORIGIN') || '*';
    const corsOptions = {
        origin: origin,
        methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
        credentials: origin !== '*',
        allowedHeaders:
            'Content-Type, Authorization, X-Requested-With, Accept, X-XSRF-TOKEN, secret, recaptchavalue, sentry-trace, baggage',
    };
    app.use(cors(corsOptions));

    // Auto migration
    if (configService.autoMigration) {
        const dataSource = new DataSource(configService.typeOrmPostgreSqlConfig as PostgresConnectionOptions);
        const connection = await dataSource.initialize();
        await connection.runMigrations();
    }

    // const redisIoAdapter = new RedisIoAdapter(app);
    // const redisOptions: RedisClientOptions = {
    //     url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
    //     ...(configService.get('REDIS_USERNAME') && { username: configService.get('REDIS_USERNAME') }),
    //     ...(configService.get('REDIS_PASSWORD') && { password: configService.get('REDIS_PASSWORD') }),
    // };

    // await redisIoAdapter.connectToRedis(redisOptions);

    // app.useWebSocketAdapter(redisIoAdapter);

    // Listen
    await app.listen(port, host);
    new LoggerService('App Started').info(`Server running on port ${host}:${port}`);
}

if (process.env.NODE_CLUSTER_ENABLE == 'true') {
    AppClusterService.clusterize(bootstrap);
} else {
    bootstrap();
}
