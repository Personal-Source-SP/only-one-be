import './boilerplate.polyfill';

import { classes } from '@automapper/classes';
import { AutomapperModule } from '@automapper/nestjs';
import { BullModule } from '@nestjs/bull';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CloudDataModule } from './modules/cloud-data/cloud-data.module';
import { DataProviderModule } from './modules/data-provider/data-provider.module';
import { GoogleModule } from './modules/google/google.module';
import { ImportDataModule } from './modules/import-data/import-data.module';
import { NotificationModule } from './modules/notification/notification.module';
import { QueueModule } from './modules/queue/queue.module';
import { ScheduleExecutorModule } from './modules/schedule/schedule.module';
import { SettingModule } from './modules/setting/setting.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { UserModule } from './modules/user/user.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { WorkerModule } from './modules/worker/worker.module';
import { AppLoggerMiddleware } from './shared/middleware/app.logger.middleware';
import { AppConfigService } from './shared/services/app-config.service';
import { SharedModule } from './shared/shared.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [SharedModule],
            useFactory: (configService: AppConfigService) => configService.typeOrmPostgreSqlConfig,
            inject: [AppConfigService],
        }),
        EventEmitterModule.forRoot({
            wildcard: true,
        }),
        AutomapperModule.forRoot({
            strategyInitializer: classes(),
        }),
        BullModule.forRootAsync({
            imports: [SharedModule],
            useFactory: async (configService: ConfigService) => ({
                redis: {
                    host: configService.get('REDIS_HOST'),
                    port: configService.get('REDIS_PORT'),
                    password: configService.get('REDIS_PASSWORD'),
                },
                prefix: configService.get('QUEUE_PREFIX') || 'bull',
            }),
            inject: [ConfigService],
        }),
        ScheduleModule.forRoot(),
        SharedModule,
        TerminusModule,
        UserModule,
        AuthModule,
        GoogleModule,
        SettingModule,
        SimulationModule,
        DataProviderModule,
        ImportDataModule,
        QueueModule,
        ScheduleExecutorModule,
        WorkerModule.register(),
        NotificationModule,
        WebsocketModule,
        CloudDataModule,
    ],
    controllers: [AppController],
    providers: [AppService, JwtService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(AppLoggerMiddleware).forRoutes('*');
    }
}
