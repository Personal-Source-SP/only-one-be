import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bull';

import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { RecordAuditLogDto } from '../dtos/requests/record-audit-log.dto';
import { AUDIT_LOG_EVENTS } from '../enums/audit-log.enum';

@Injectable()
export class AuditLogListener {
    constructor(@InjectQueue(QUEUE_NAME.AUDIT_LOG_JOB) private readonly auditLogQueue: Queue) {}

    @OnEvent(AUDIT_LOG_EVENTS.RECORD)
    async handleAuditLogRecord(dto: RecordAuditLogDto): Promise<void> {
        const jobId = dto.deduplicationKey || undefined;
        await this.auditLogQueue.add(dto, {
            jobId,
            attempts: 3,
            removeOnComplete: true,
            backoff: {
                delay: 2000,
                type: 'exponential',
            },
        });
    }
}
