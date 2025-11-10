import { BullModule } from '@nestjs/bull';
import { forwardRef, Global, Module } from '@nestjs/common';

import { SharedModule } from '../../shared/shared.module';
import { QueueController } from './controllers/queue.controller';
import { QUEUE_NAME } from './enums/queue-name.enum';
import { QueueService } from './services/queue.service';

@Global()
@Module({
    imports: [
        forwardRef(() => SharedModule),
        BullModule.registerQueue({
            name: QUEUE_NAME.SCRAPING_JOB_QUEUE,
        }),
    ],
    controllers: [QueueController],
    providers: [QueueService],
    exports: [QueueService],
})
export class QueueModule {}
