import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bull';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppConfigService } from '../../shared/services/app-config.service';
import { SharedModule } from '../../shared/shared.module';
import { QUEUE_NAME } from '../queue/enums/queue-name.enum';
import { createBasicAuthMiddleware } from './create-basic-auth-middleware';

@Module({})
export class BullBoardAppModule {
    static register(): DynamicModule {
        const appConfigService = new AppConfigService();
        const enabled = appConfigService.getBoolean('ENABLE_BULL_BOARD');

        if (!enabled) {
            return {
                module: BullBoardAppModule,
                imports: [],
                providers: [],
                exports: [],
            };
        }

        const queueValues = Object.values(QUEUE_NAME);
        const queueImports = queueValues.map((name) => BullModule.registerQueue({ name }));
        const bullBoardFeatureImports = queueValues.map((name) =>
            BullBoardModule.forFeature({
                name,
                adapter: BullAdapter,
            }),
        );

        return {
            module: BullBoardAppModule,
            imports: [
                SharedModule,
                ...queueImports,
                BullBoardModule.forRootAsync({
                    imports: [SharedModule, ConfigModule],
                    useFactory: (config: AppConfigService, _configService: ConfigService) => {
                        const boardConfig = config.bullBoardConfig;
                        return {
                            route: boardConfig.path,
                            adapter: ExpressAdapter,
                            middleware: createBasicAuthMiddleware(boardConfig.username, boardConfig.password),
                        };
                    },
                    inject: [AppConfigService, ConfigService],
                }),
                ...bullBoardFeatureImports,
            ],
            providers: [],
            exports: [],
        };
    }
}
