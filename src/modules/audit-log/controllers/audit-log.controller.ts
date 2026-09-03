import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { AUDIT_LOG_PAGINATION_CONFIG } from '../constants/audit-log-pagination.config';
import { AuditLogDto } from '../dtos/audit-log.dto';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { AuditLogService } from '../services/audit-log.service';

@Controller('audit-logs')
@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AuditLogController extends BaseController<AuditLogEntity, AuditLogDto> {
    constructor(private readonly auditLogService: AuditLogService) {
        super(auditLogService, AUDIT_LOG_PAGINATION_CONFIG, {
            enableDelete: false,
            enableDeleteMany: false,
            enableGetAll: false,
            enableGetById: true,
            enablePagination: true,
        });
    }
}
