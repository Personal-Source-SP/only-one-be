import { classes } from '@automapper/classes';
import { AutomapperModule } from '@automapper/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import Redis from 'ioredis';

import { FileHelper } from './helpers/file-helper';
import { ApiFetcherService } from './services/api-fetcher.service';
import { AppConfigService } from './services/app-config.service';
import { BaseHttpService } from './services/base-http.service';
import { CacheService } from './services/cache.service';
import { HtmlFetcherService } from './services/html-fetcher.service';
import { LocalFileService } from './services/local-file.service';
import { LoggerService } from './services/logger.service';
import { PuppeteerService } from './services/puppeteer.service';
import { UtilsService } from './services/utils.service';
import { JwtStrategy } from './strategy/jwt.strategy';

const helpers = [FileHelper];
const providers = [
    AppConfigService,
    LoggerService,
    UtilsService,
    CacheService,
    BaseHttpService,
    ApiFetcherService,
    HtmlFetcherService,
    PuppeteerService,
    LocalFileService,
    JwtStrategy,
];

@Global()
@Module({
    providers: [
        ...providers,
        ...helpers,
        {
            provide: Redis,
            useFactory: (appConfigService: AppConfigService) => {
                return new Redis({
                    host: appConfigService?.redisConfig?.host,
                    port: appConfigService?.redisConfig?.port,
                    password: appConfigService?.redisConfig?.password,
                });
            },
            inject: [AppConfigService],
        },
    ],
    imports: [
        HttpModule.registerAsync({
            useFactory: async (configService: AppConfigService) => ({
                timeout: configService.getNumber('HTTP_TIMEOUT') || 3000,
                maxRedirects: configService.getNumber('HTTP_MAX_REDIRECTS') || 50,
            }),
            inject: [AppConfigService],
        }),
        AutomapperModule.forRoot({
            strategyInitializer: classes(),
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
    ],
    exports: [...providers, ...helpers, Redis, HttpModule, AutomapperModule],
})
export class SharedModule {}
