import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { AuditLogDto } from '../dtos/audit-log.dto';
import { RecordAuditLogDto } from '../dtos/requests/record-audit-log.dto';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { AUDIT_LOG_EVENTS, AuditStatus } from '../enums/audit-log.enum';

@Injectable()
export class AuditLogService extends BaseService<AuditLogEntity, AuditLogDto> {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(AuditLogEntity)
        private readonly auditLogRepository: Repository<AuditLogEntity>,
    ) {
        super(auditLogRepository, mapper, AuditLogDto, AuditLogService.name);
    }

    /**
     * Dispatches an asynchronous audit log record event
     */
    record(dto: RecordAuditLogDto): void {
        this.eventEmitter.emit(AUDIT_LOG_EVENTS.RECORD, dto);
    }

    /**
     * Persists audit log record directly to database with sensitive data sanitization
     */
    async saveAuditLog(dto: RecordAuditLogDto): Promise<AuditLogEntity> {
        const sanitizedOld = this.sanitizeData(dto.oldValues);
        const sanitizedNew = this.sanitizeData(dto.newValues);

        const entity = this.auditLogRepository.create({
            ...dto,
            oldValues: sanitizedOld,
            newValues: sanitizedNew,
            status: dto.status || AuditStatus.SUCCESS,
        });

        return this.auditLogRepository.save(entity);
    }

    private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
        if (!data || typeof data !== 'object') return data;

        const sensitiveKeys = ['password', 'secret', 'secretKey', 'token', 'apiKey', 'authorization'];

        const copy = { ...data };

        for (const key of Object.keys(copy)) {
            if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
                copy[key] = '***REDACTED***';
            } else if (typeof copy[key] === 'object' && copy[key] !== null) {
                copy[key] = this.sanitizeData(copy[key]);
            }
        }

        return copy;
    }
}
