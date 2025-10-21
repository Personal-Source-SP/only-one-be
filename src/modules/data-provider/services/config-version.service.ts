import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { ConfigVersionDto } from '../dtos/config-version.dto';
import { CreateConfigVersionRequestDto } from '../dtos/requests';
import { ConfigVersionEntity } from '../entities/config-version.entity';
import { ConfigVersionType } from '../enums';

@Injectable()
export class ConfigVersionService extends BaseService<ConfigVersionEntity> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly loggerService: LoggerService,
        @InjectMapper() private readonly mapper: Mapper,
        @InjectRepository(ConfigVersionEntity)
        private readonly dataProviderConfigVersionsRepository: Repository<ConfigVersionEntity>,
    ) {
        super(dataProviderConfigVersionsRepository);
    }

    async createConfigVersion(request: CreateConfigVersionRequestDto, user?: PayloadDto): Promise<boolean> {
        const latestVersion = await this.dataProviderConfigVersionsRepository
            .createQueryBuilder('dataProviderConfigVersions')
            .where('dataProviderConfigVersions.dataProviderId = :dataProviderId', { dataProviderId: request.dataProviderId })
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
                        { dataProviderId: request.dataProviderId, isActive: true },
                        { isActive: false },
                    );
                }

                await dataProviderConfigVersionsRepository.save(dataProviderConfigVersionEntity);

                return true;
            });

            return result;
        } catch (error) {
            this.loggerService.error(error);
            throw error;
        }
    }

    async getConfigVersionOptions(dataProviderId: string): Promise<ConfigVersionDto[]> {
        const dataProviderConfigVersions = await this.dataProviderConfigVersionsRepository
            .createQueryBuilder('dataProviderConfigVersions')
            .leftJoinAndSelect('dataProviderConfigVersions.user', 'user')
            .where('dataProviderConfigVersions.dataProviderId = :dataProviderId', { dataProviderId })
            .orderBy('dataProviderConfigVersions.versionId', 'DESC')
            .select([
                'dataProviderConfigVersions.id',
                'dataProviderConfigVersions.versionId',
                'dataProviderConfigVersions.changeType',
                'dataProviderConfigVersions.isActive',
            ])
            .getMany();

        if (!dataProviderConfigVersions?.length) {
            this.loggerService.warn(`No data provider config versions found for data provider ID: ${dataProviderId}`);
            return [];
        }

        return this.mapper.mapArray(dataProviderConfigVersions, ConfigVersionEntity, ConfigVersionDto);
    }

    async getByVersionId(dataProviderId: string, versionId: number): Promise<ConfigVersionDto> {
        const dataProviderConfigVersion = await this.findOneByFilter({
            dataProviderId,
            versionId,
        });

        if (!dataProviderConfigVersion) {
            this.loggerService.warn(
                `No data provider config version found for data provider ID: ${dataProviderId} and version id: ${versionId}`,
            );
            throw new NotFoundException('No data provider config version found');
        }

        return this.mapper.map(dataProviderConfigVersion, ConfigVersionEntity, ConfigVersionDto);
    }

    async rollbackToVersionId(dataProviderId: string, versionId: number, user?: PayloadDto): Promise<boolean> {
        const dataProviderConfigVersion = await this.getByVersionId(dataProviderId, versionId);
        if (dataProviderConfigVersion.isActive) return true;

        const requestCreate = new CreateConfigVersionRequestDto({
            dataProviderId,
            isActive: true,
            changeType: ConfigVersionType.ROLLBACK,
            targetConfig: dataProviderConfigVersion.targetConfig,
            changeDescription: `Rollback to version id: ${versionId}`,
        });

        return await this.createConfigVersion(requestCreate, user);
    }

    async deleteConfigVersion(dataProviderId: string, versionId: number): Promise<boolean> {
        const dataProviderConfigVersion = await this.findOneByFilter({
            dataProviderId,
            versionId,
        });

        if (!dataProviderConfigVersion) {
            this.loggerService.warn(
                `No data provider config version found for data provider ID: ${dataProviderId} and version id: ${versionId}`,
            );
            throw new NotFoundException('No data provider config version found');
        }

        if (dataProviderConfigVersion.isActive) {
            this.loggerService.warn(
                `Cannot delete active data provider config version for data provider ID: ${dataProviderId} and version id: ${versionId}`,
            );
            throw new BadRequestException('Cannot delete active data provider config version');
        }

        const result = await this.delete(dataProviderConfigVersion.id);
        return result;
    }
}
