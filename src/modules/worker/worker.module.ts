import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigService } from '../../shared/services/app-config.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { QueueModule } from '../queue/queue.module';
import { ScheduleExecutorModule } from '../schedule/schedule.module';
import { AuditLogWorkerProcessor } from './processors/audit-log-worker.processor';
import { DiscoveryIngestionWorkerProcessor } from './processors/discovery-ingestion-worker.processor';
import { DiscoveryValidationWorkerProcessor } from './processors/discovery-validation-worker.processor';
import { ScrapingWorkerProcessor } from './processors/scraping-worker.processor';

const processors = [
    ScrapingWorkerProcessor,
    DiscoveryValidationWorkerProcessor,
    DiscoveryIngestionWorkerProcessor,
    AuditLogWorkerProcessor,
];

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
            imports: [QueueModule, ConfigModule, ScheduleExecutorModule, DataProviderModule, AuditLogModule],
            controllers: [],
            providers: providers,
            exports: [],
        };
    }
}
