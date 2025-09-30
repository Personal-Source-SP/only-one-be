import { classes } from '@automapper/classes';
import { AutomapperModule } from '@automapper/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AppConfigService } from './services/app-config.service';
import { BaseHttpService } from './services/base-http.service';
import { LoggerService } from './services/logger.service';
import { PuppeteerService } from './services/puppeteer.service';
import { UtilsService } from './services/utils.service';

const providers = [AppConfigService, LoggerService, UtilsService, BaseHttpService, PuppeteerService];

@Global()
@Module({
    providers,
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
    exports: [...providers, HttpModule, AutomapperModule],
})
export class SharedModule {}
