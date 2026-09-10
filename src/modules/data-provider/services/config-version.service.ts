import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
import { ConfigVersionDto } from '../dtos/config-version.dto';
import { CreateConfigVersionRequestDto } from '../dtos/requests';
import { ConfigVersionEntity } from '../entities/config-version.entity';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ConfigVersionType } from '../enums';

@Injectable()
export class ConfigVersionService extends BaseService<ConfigVersionEntity, ConfigVersionDto> {
    constructor(
        private readonly dataSource: DataSource,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ConfigVersionEntity) dataProviderConfigVersionsRepository: Repository<ConfigVersionEntity>,
    ) {
        super(dataProviderConfigVersionsRepository, mapper, ConfigVersionDto, ConfigVersionService.name);
    }

    async create(request: CreateConfigVersionRequestDto, user?: PayloadDto): Promise<ConfigVersionDto> {
        const latestVersion = await this.repository
            .createQueryBuilder('v')
            .where('v.featureId = :featureId', { featureId: request.featureId })
            .orderBy('v.versionId', 'DESC')
            .select(['v.versionId'])
            .getOne();

        const entity = this.mapper.map(request, CreateConfigVersionRequestDto, ConfigVersionEntity);
        entity.versionId = (latestVersion?.versionId ?? 0) + 1;
        entity.createdBy = user?.id;

        return await this.dataSource.transaction(async (manager) => {
            const configVersionRepo = manager.getRepository(ConfigVersionEntity);

            if (request.isActive) {
                await configVersionRepo.update({ featureId: request.featureId, isActive: true }, { isActive: false });
            }

            const saved = await configVersionRepo.save(entity);
            return this.mapEntityToDto(saved) as ConfigVersionDto;
        });
    }

    async getByFeatureId(featureId: string): Promise<ConfigVersionDto[]> {
        const dataProviderConfigVersions = await this.repository
            .createQueryBuilder('dataProviderConfigVersions')
            .leftJoinAndSelect('dataProviderConfigVersions.user', 'user')
            .where('dataProviderConfigVersions.featureId = :featureId', { featureId })
            .orderBy('dataProviderConfigVersions.versionId', 'DESC')
            .select([
                'dataProviderConfigVersions.id',
                'dataProviderConfigVersions.versionId',
                'dataProviderConfigVersions.changeType',
                'dataProviderConfigVersions.changeDescription',
                'dataProviderConfigVersions.createdBy',
                'dataProviderConfigVersions.isActive',
                'dataProviderConfigVersions.config',
                'dataProviderConfigVersions.createdAt',
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.email',
                'user.userName',
            ])
            .getMany();

        if (!dataProviderConfigVersions?.length) {
            this.loggerService.warn(`No config versions found for feature ID: ${featureId}`);
            return [];
        }

        return this.mapEntityToDto(dataProviderConfigVersions) as ConfigVersionDto[];
    }

    async rollbackByFeatureId(featureId: string, versionId: number, user?: PayloadDto): Promise<boolean> {
        const dataProviderConfigVersion = await this.findOneByFilter({
            featureId,
            versionId,
        });

        if (!dataProviderConfigVersion) {
            throw new AppException(DataProviderError.ConfigVersionNotFound(versionId, featureId));
        }

        if (dataProviderConfigVersion.isActive) return true;

        const requestCreate = new CreateConfigVersionRequestDto({
            featureId,
            isActive: true,
            changeType: ConfigVersionType.ROLLBACK,
            config: dataProviderConfigVersion.config,
            changeDescription: `Rollback to version id: ${versionId}`,
        });

        await this.dataSource.transaction(async (manager) => {
            const configVersionRepo = manager.getRepository(ConfigVersionEntity);
            const featureRepo = manager.getRepository(DataProviderFeatureEntity);

            // 1. Deactivate current active versions
            await configVersionRepo.update({ featureId, isActive: true }, { isActive: false });

            // 2. Insert new rollback snapshot
            const latestVersion = await configVersionRepo
                .createQueryBuilder('v')
                .where('v.featureId = :featureId', { featureId })
                .orderBy('v.versionId', 'DESC')
                .select(['v.versionId'])
                .getOne();

            const newVersionEntity = this.mapper.map(requestCreate, CreateConfigVersionRequestDto, ConfigVersionEntity);
            newVersionEntity.createdBy = user?.id;
            newVersionEntity.versionId = (latestVersion?.versionId ?? 0) + 1;

            await configVersionRepo.save(newVersionEntity);

            // 3. Synchronize feature entity config
            await featureRepo.update(featureId, {
                lastErrorType: null,
                lastErrorMessage: null,
                consecutiveFailures: 0,
                config: dataProviderConfigVersion.config,
            });
        });

        return true;
    }

    async deleteByFeatureId(featureId: string, versionId: number): Promise<boolean> {
        const dataProviderConfigVersion = await this.findOneByFilter({
            featureId,
            versionId,
        });

        if (!dataProviderConfigVersion) {
            this.loggerService.warn(`No config version found for feature ID: ${featureId} and version id: ${versionId}`);
            throw new AppException(DataProviderError.ConfigVersionNotFound(versionId, featureId));
        }

        if (dataProviderConfigVersion.isActive) {
            this.loggerService.warn(`Cannot delete active config version for feature ID: ${featureId} and version id: ${versionId}`);
            throw new AppException(DataProviderError.CannotDeleteActiveConfigVersion);
        }

        const result = await super.delete(dataProviderConfigVersion.id);
        return result;
    }
}
