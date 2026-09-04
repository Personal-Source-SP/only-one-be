import {
    EnumField,
    EnumFieldOptional,
    NumberFieldOptional,
    ObjectFieldOptional,
    StringField,
    StringFieldOptional,
} from '../../../../decorators';
import { AuditAction, AuditResource, AuditStatus } from '../../enums/audit-log.enum';

export class RecordAuditLogDto {
    @StringFieldOptional()
    userId?: string;

    @StringFieldOptional()
    userEmail?: string;

    @EnumField(() => AuditAction)
    action: AuditAction;

    @StringField()
    resource: AuditResource | string;

    @StringFieldOptional()
    resourceId?: string;

    @StringFieldOptional()
    ipAddress?: string;

    @StringFieldOptional()
    userAgent?: string;

    @ObjectFieldOptional()
    oldValues?: Record<string, any>;

    @ObjectFieldOptional()
    newValues?: Record<string, any>;

    @StringFieldOptional()
    description?: string;

    @ObjectFieldOptional()
    metadata?: Record<string, any>;

    @EnumFieldOptional(() => AuditStatus)
    status?: AuditStatus;

    @StringFieldOptional()
    errorMessage?: string;

    @NumberFieldOptional({ int: true })
    durationMs?: number;
}
