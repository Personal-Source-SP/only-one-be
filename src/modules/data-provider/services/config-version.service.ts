import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { ConfigVersionDto } from '../dtos/config-version.dto';
import { CreateConfigVersionRequestDto } from '../dtos/requests';
import { ConfigVersionEntity } from '../entities/config-version.entity';
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
            .createQueryBuilder('dataProviderConfigVersions')
            .where('dataProviderConfigVersions.featureId = :featureId', { featureId: request.featureId })
            .orderBy('dataProviderConfigVersions.versionId', 'DESC')
            .select(['dataProviderConfigVersions.versionId'])
            .getOne();

        const dataProviderConfigVersionEntity = this.mapper.map(request, CreateConfigVersionRequestDto, ConfigVersionEntity);
        dataProviderConfigVersionEntity.createdBy = user?.id;
        dataProviderConfigVersionEntity.versionId = (latestVersion?.versionId ?? 0) + 1;

        try {
            const result = await this.dataSource.transaction(async (manager) => {
                const dataProviderConfigVersionsRepository = manager.getRepository(ConfigVersionEntity);

                if (request.isActive) {
                    await dataProviderConfigVersionsRepository.update(
                        { featureId: request.featureId, isActive: true },
                        { isActive: false },
                    );
                }

                await dataProviderConfigVersionsRepository.save(dataProviderConfigVersionEntity);

                return this.mapEntityToDto(dataProviderConfigVersionEntity) as ConfigVersionDto;
            });

            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getConfigVersionOptionsByFeature(featureId: string): Promise<ConfigVersionDto[]> {
        const dataProviderConfigVersions = await this.repository
            .createQueryBuilder('dataProviderConfigVersions')
            .leftJoinAndSelect('dataProviderConfigVersions.user', 'user')
            .where('dataProviderConfigVersions.featureId = :featureId', { featureId })
            .orderBy('dataProviderConfigVersions.versionId', 'DESC')
            .select([
                'dataProviderConfigVersions.id',
                'dataProviderConfigVersions.versionId',
                'dataProviderConfigVersions.changeType',
                'dataProviderConfigVersions.isActive',
                'dataProviderConfigVersions.config',
                'dataProviderConfigVersions.createdAt',
            ])
            .getMany();

        if (!dataProviderConfigVersions?.length) {
            this.loggerService.warn(`No config versions found for feature ID: ${featureId}`);
            return [];
        }

        return this.mapEntityToDto(dataProviderConfigVersions) as ConfigVersionDto[];
    }

    async rollbackToVersionIdByFeature(featureId: string, versionId: number, user?: PayloadDto): Promise<boolean> {
        const dataProviderConfigVersion = await this.findOneByFilter({
            featureId,
            versionId,
        });

        if (!dataProviderConfigVersion) {
            throw new NotFoundException(`Config version ${versionId} not found for feature ID ${featureId}`);
        }

        if (dataProviderConfigVersion.isActive) return true;

        const requestCreate = new CreateConfigVersionRequestDto({
            featureId,
            isActive: true,
            changeType: ConfigVersionType.ROLLBACK,
            config: dataProviderConfigVersion.config,
            changeDescription: `Rollback to version id: ${versionId}`,
        });

        const configVersion = await this.create(requestCreate, user);
        return !!configVersion;
    }

    async deleteConfigVersionByFeature(featureId: string, versionId: number): Promise<boolean> {
        const dataProviderConfigVersion = await this.findOneByFilter({
            featureId,
            versionId,
        });

        if (!dataProviderConfigVersion) {
            this.loggerService.warn(`No config version found for feature ID: ${featureId} and version id: ${versionId}`);
            throw new NotFoundException('No data provider config version found');
        }

        if (dataProviderConfigVersion.isActive) {
            this.loggerService.warn(`Cannot delete active config version for feature ID: ${featureId} and version id: ${versionId}`);
            throw new BadRequestException('Cannot delete active data provider config version');
        }

        const result = await this.delete(dataProviderConfigVersion.id);
        return result;
    }
}
