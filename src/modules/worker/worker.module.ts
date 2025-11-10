import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigService } from '../../shared/services/app-config.service';
import { QueueModule } from '../queue/queue.module';
import { ScrapingWorkerProcessor } from './processors/scraping-worker.processor';

const processors = [ScrapingWorkerProcessor];

@Module({})
export class WorkerModule {
    static register(): DynamicModule {
        const providers = [];

        // Instantiate AppConfigService to read the configuration
        // This is done outside of NestJS DI for this static method, specifically for decision making.
        // The ScrapingWorkerProcessor, if added, will receive AppConfigService via standard DI.
        const appConfigService = new AppConfigService();
        const workerNodeEnabled = appConfigService.getBoolean('WORKER_NODE_ENABLED');

        if (workerNodeEnabled) {
            providers.push(...processors);
        }

        return {
            module: WorkerModule,
            imports: [
                QueueModule,
                ConfigModule, // For ConfigService, if needed by processor
            ],
            controllers: [],
            providers: providers,
            exports: [],
        };
    }
}
