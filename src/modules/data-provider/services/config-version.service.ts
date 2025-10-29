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
export class ConfigVersionService extends BaseService<ConfigVersionEntity, ConfigVersionDto> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly loggerService: LoggerService,

        @InjectMapper() mapper: Mapper,

        @InjectRepository(ConfigVersionEntity)
        private readonly dataProviderConfigVersionsRepository: Repository<ConfigVersionEntity>,
    ) {
        super(dataProviderConfigVersionsRepository, mapper);
    }

    async create(request: CreateConfigVersionRequestDto, user?: PayloadDto): Promise<ConfigVersionDto> {
        const latestVersion = await this.dataProviderConfigVersionsRepository
            .createQueryBuilder('dataProviderConfigVersions')
            .where('dataProviderConfigVersions.dataProviderId = :dataProviderId', { dataProviderId: request.dataProviderId })
            .orderBy('dataProviderConfigVersions.versionId', 'DESC')
            .select(['dataProviderConfigVersions.versionId'])
            .getOne();

        const dataProviderConfigVersionEntity = this.mapDataToEntity(request);
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

                return this.mapEntityToDto(dataProviderConfigVersionEntity) as ConfigVersionDto;
            });

            return result;
        } catch (error) {
            this.handleError(error);
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

        return this.mapEntityToDto(dataProviderConfigVersions) as ConfigVersionDto[];
    }

    async rollbackToVersionId(dataProviderId: string, versionId: number, user?: PayloadDto): Promise<boolean> {
        const dataProviderConfigVersion = await this.findOneByFilter({
            dataProviderId,
            versionId,
        });

        if (dataProviderConfigVersion.isActive) return true;

        const requestCreate = new CreateConfigVersionRequestDto({
            dataProviderId,
            isActive: true,
            changeType: ConfigVersionType.ROLLBACK,
            targetConfig: dataProviderConfigVersion.targetConfig,
            changeDescription: `Rollback to version id: ${versionId}`,
        });

        const configVersion = await this.create(requestCreate, user);
        return !!configVersion;
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
