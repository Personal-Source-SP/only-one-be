import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { DiscoveryValidationLogEntity } from '../entities/discovery-validation-log.entity';

@Injectable()
export class DiscoveryValidationLogService extends BaseService<DiscoveryValidationLogEntity, DiscoveryValidationLogDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DiscoveryValidationLogEntity)
        private readonly logRepository: Repository<DiscoveryValidationLogEntity>,
    ) {
        super(logRepository, mapper, DiscoveryValidationLogDto, DiscoveryValidationLogService.name);
    }

    createValidationLog(data: Partial<DiscoveryValidationLogEntity>): DiscoveryValidationLogEntity {
        return this.logRepository.create(data);
    }

    async markPreviousLogsNotLatest(where: FindOptionsWhere<DiscoveryValidationLogEntity>): Promise<void> {
        await this.logRepository.update(where, { isLatestLog: false });
    }

    async getValidationLogsByUrl(urlId: string): Promise<DiscoveryValidationLogDto[]> {
        const entities = await this.logRepository.find({
            where: { discoveryUrlId: urlId },
            order: { createdAt: 'DESC' },
        });

        return this.mapper.mapArray(entities, DiscoveryValidationLogEntity, DiscoveryValidationLogDto);
    }

    async getValidationLogsBySession(sessionId: string): Promise<DiscoveryValidationLogDto[]> {
        const entities = await this.logRepository.find({
            where: { sessionId },
            order: { createdAt: 'DESC' },
        });

        return this.mapper.mapArray(entities, DiscoveryValidationLogEntity, DiscoveryValidationLogDto);
    }
}
