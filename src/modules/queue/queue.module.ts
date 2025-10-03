import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';

import { SharedModule } from '../../shared/shared.module';
import { QueueController } from './controllers/queue.controller';
import { QUEUE_NAME } from './enums/queue-name.enum';
import { QueueService } from './services/queue.service';

@Module({
    imports: [
        forwardRef(() => SharedModule),
        BullModule.registerQueue({
            name: QUEUE_NAME.DATA_PROVIDER_QUEUE,
        }),
    ],
    controllers: [QueueController],
    providers: [QueueService],
    exports: [QueueService],
})
export class QueueModule {}
