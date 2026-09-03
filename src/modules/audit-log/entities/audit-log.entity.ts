import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { AuditAction, AuditResource, AuditStatus } from '../enums/audit-log.enum';

@Entity({ name: 'audit_logs' })
@Index(['resource', 'resourceId'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLogEntity extends AbstractEntity {
    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    @AutoMap()
    userId?: string;

    @Column({ name: 'user_email', length: 200, nullable: true })
    @AutoMap()
    userEmail?: string;

    @Column({ type: 'varchar', length: 50 })
    @AutoMap()
    action: AuditAction;

    @Column({ type: 'varchar', length: 100 })
    @AutoMap()
    resource: AuditResource | string;

    @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true })
    @AutoMap()
    resourceId?: string;

    @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
    @AutoMap()
    ipAddress?: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    @AutoMap()
    userAgent?: string;

    @Column({ name: 'old_values', type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    oldValues?: Record<string, any>;

    @Column({ name: 'new_values', type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    newValues?: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    description?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @Column({ type: 'varchar', length: 50, default: AuditStatus.SUCCESS })
    @AutoMap()
    status: AuditStatus;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    @AutoMap()
    errorMessage?: string;

    @Column({ name: 'duration_ms', type: 'integer', nullable: true })
    @AutoMap()
    durationMs?: number;
}
