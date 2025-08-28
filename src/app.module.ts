import './boilerplate.polyfill';

import { classes } from '@automapper/classes';
import { AutomapperModule } from '@automapper/nestjs';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { GoogleModule } from './modules/google/google.module';
import { AppLoggerMiddleware } from './shared/middleware/app.logger.middleware';
import { AppConfigService } from './shared/services/app-config.service';
import { SharedModule } from './shared/shared.module';

@Module({
    imports: [
        TerminusModule,
        TypeOrmModule.forRootAsync({
            imports: [SharedModule],
            useFactory: (configService: AppConfigService) => configService.typeOrmPostgreSqlConfig,
            inject: [AppConfigService],
        }),
        EventEmitterModule.forRoot(),
        AutomapperModule.forRoot({
            strategyInitializer: classes(),
        }),
        SharedModule,
        UserModule,
        AuthModule,
        GoogleModule,
    ],
    controllers: [AppController],
    providers: [AppService, JwtService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(AppLoggerMiddleware).forRoutes('*');
    }
}
