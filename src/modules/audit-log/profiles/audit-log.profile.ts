import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { AuditLogDto } from '../dtos/audit-log.dto';
import { AuditLogEntity } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile() {
        return (mapper: Mapper) => {
            createMap(mapper, AuditLogEntity, AuditLogDto);
        };
    }
}
