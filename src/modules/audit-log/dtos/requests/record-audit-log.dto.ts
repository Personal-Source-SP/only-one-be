import { IsEnum, IsOptional, IsString } from 'class-validator';

import { AuditAction, AuditResource, AuditStatus } from '../../enums/audit-log.enum';

export class RecordAuditLogDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    userEmail?: string;

    @IsEnum(AuditAction)
    action: AuditAction;

    @IsString()
    resource: AuditResource | string;

    @IsOptional()
    @IsString()
    resourceId?: string;

    @IsOptional()
    @IsString()
    ipAddress?: string;

    @IsOptional()
    @IsString()
    userAgent?: string;

    @IsOptional()
    oldValues?: Record<string, any>;

    @IsOptional()
    newValues?: Record<string, any>;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    metadata?: Record<string, any>;

    @IsOptional()
    @IsEnum(AuditStatus)
    status?: AuditStatus;

    @IsOptional()
    @IsString()
    errorMessage?: string;

    @IsOptional()
    durationMs?: number;
}
