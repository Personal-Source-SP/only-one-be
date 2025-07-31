import 'module-alias/register';
import 'source-map-support/register';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import cors from 'cors';
import { json } from 'express';
import morgan from 'morgan'; // HTTP request logger
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { AppModule } from './app.module';
import { AppClusterService } from './app-cluster.service';
import { AllExceptionsFilter } from './filters/all-exception.filter';
import { AppConfigService } from './shared/services/app-config.service';
import { LoggerService } from './shared/services/logger.service';
import { SharedModule } from './shared/shared.module';
import { setupSwagger } from './shared/swagger/setup';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), { cors: true });
    app.setGlobalPrefix('api');

    const loggerService = app.select(SharedModule).get(LoggerService);
    app.useLogger(loggerService);
    app.use(
        morgan('combined', {
            stream: {
                write: (message) => {
                    loggerService.log(message);
                },
            },
        }),
    );

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            // exceptionFactory: errors => new BadRequestException(errors),
            // dismissDefaultMessages: true,//TODO: disable in prod (if required)
            validationError: {
                target: false,
            },
        }),
    );

    app.enableVersioning({
        type: VersioningType.URI,
    });

    app.use(json({ limit: '50mb' }));

    const configService = app.select(SharedModule).get(AppConfigService);

    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    if (['development', 'staging'].includes(configService.nodeEnv)) {
        const document = setupSwagger(app, configService.swaggerConfig);
        // fs.writeFileSync('./swagger.json', JSON.stringify(document));
        app.use('/swagger.json', (req, res) => {
            res.json(document);
        });
    }

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

    if (configService.autoMigration) {
        const dataSource = new DataSource(configService.typeOrmPostgreSqlConfig as PostgresConnectionOptions);
        const connection = await dataSource.initialize();
        await connection.runMigrations();
    }

    await app.listen(port, host);

    console.log(`server running on port ${host}:${port}`);
    loggerService.warn(`server running on port ${host}:${port}`);
}

if (process.env.NODE_CLUSTER_ENABLE == 'true') {
    AppClusterService.clusterize(bootstrap);
} else {
    bootstrap();
}
