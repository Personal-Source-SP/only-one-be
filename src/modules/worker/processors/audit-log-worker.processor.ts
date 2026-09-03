import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { RecordAuditLogDto } from '../../audit-log/dtos/requests/record-audit-log.dto';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';

@Processor(QUEUE_NAME.AUDIT_LOG_JOB)
export class AuditLogWorkerProcessor {
    private readonly logger: LoggerService = new LoggerService(AuditLogWorkerProcessor.name);

    constructor(private readonly auditLogService: AuditLogService) {}

    @Process()
    async handleAuditLogJob(job: Job<RecordAuditLogDto>): Promise<void> {
        try {
            this.logger.log(`Processing audit log job #${job.id}: ${job.data.action} on ${job.data.resource}`);
            await this.auditLogService.saveAuditLog(job.data);
        } catch (error) {
            this.logger.error(`Failed to process audit log job #${job.id}: ${error.message}`);
            throw error;
        }
    }
}
