import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { AuditAction, AuditResource, AuditStatus } from '../enums/audit-log.enum';

@Exclude()
export class AuditLogDto extends AbstractDto {
    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    userId?: string;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    userEmail?: string;

    @Expose()
    @ApiProperty({ enum: AuditAction })
    @AutoMap()
    action: AuditAction;

    @Expose()
    @ApiProperty()
    @AutoMap()
    resource: AuditResource | string;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    resourceId?: string;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    ipAddress?: string;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    userAgent?: string;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap(() => Object)
    oldValues?: Record<string, any>;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap(() => Object)
    newValues?: Record<string, any>;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    description?: string;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @Expose()
    @ApiProperty({ enum: AuditStatus })
    @AutoMap()
    status: AuditStatus;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    errorMessage?: string;

    @Expose()
    @ApiPropertyOptional()
    @AutoMap()
    durationMs?: number;
}
