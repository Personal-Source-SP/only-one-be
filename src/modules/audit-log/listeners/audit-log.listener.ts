import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { RecordAuditLogDto } from '../dtos/requests/record-audit-log.dto';
import { AUDIT_LOG_EVENTS } from '../enums/audit-log.enum';

@Injectable()
export class AuditLogListener {
    private readonly logger: LoggerService = new LoggerService(AuditLogListener.name);

    constructor(@InjectQueue(QUEUE_NAME.AUDIT_LOG_JOB) private readonly auditLogQueue: Queue) {}

    @OnEvent(AUDIT_LOG_EVENTS.RECORD)
    async handleAuditLogRecord(dto: RecordAuditLogDto): Promise<void> {
        try {
            await this.auditLogQueue.add(dto, {
                attempts: 3,
                removeOnComplete: true,
                backoff: {
                    delay: 2000,
                    type: 'exponential',
                },
            });
        } catch (error) {
            this.logger.error(`Error queuing audit log event: ${error.message}`);
        }
    }
}
