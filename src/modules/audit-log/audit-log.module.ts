import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QUEUE_NAME } from '../queue/enums/queue-name.enum';
import { QueueModule } from '../queue/queue.module';
import { AuditLogController } from './controllers/audit-log.controller';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogListener } from './listeners/audit-log.listener';
import { AuditLogProfile } from './profiles/audit-log.profile';
import { AuditLogService } from './services/audit-log.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([AuditLogEntity]),
        QueueModule,
        BullModule.registerQueue({
            name: QUEUE_NAME.AUDIT_LOG_JOB,
        }),
    ],
    controllers: [AuditLogController],
    providers: [AuditLogService, AuditLogProfile, AuditLogListener],
    exports: [AuditLogService],
})
export class AuditLogModule {}
