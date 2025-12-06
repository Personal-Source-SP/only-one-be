import { classes } from '@automapper/classes';
import { AutomapperModule } from '@automapper/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { FileHelper } from './helpers/file-helper';
import { AppConfigService } from './services/app-config.service';
import { BaseHttpService } from './services/base-http.service';
import { LocalFileService } from './services/local-file.service';
import { LoggerService } from './services/logger.service';
import { PuppeteerService } from './services/puppeteer.service';
import { UtilsService } from './services/utils.service';
import { JwtStrategy } from './strategy/jwt.strategy';

const helpers = [FileHelper];
const providers = [AppConfigService, LoggerService, UtilsService, BaseHttpService, PuppeteerService, LocalFileService, JwtStrategy];

@Global()
@Module({
    providers: [...providers, ...helpers],
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
    exports: [...providers, ...helpers, HttpModule, AutomapperModule],
})
export class SharedModule {}
