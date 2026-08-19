import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
import { CreateDataProviderFeatureRequestDto, UpdateFeatureConfigRequestDto } from '../dtos/requests/data-provider-feature-request.dto';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../enums';
import { ConfigVersionType } from '../enums/config-version-type.enum';
import { FeatureRunnerRegistry } from '../runners/feature-runner.registry';
import { ConfigVersionService } from './config-version.service';

@Injectable()
export class DataProviderFeatureService extends BaseService<DataProviderFeatureEntity, DataProviderFeatureDto> {
    constructor(
        @InjectRepository(DataProviderFeatureEntity)
        private readonly dataProviderFeatureRepository: Repository<DataProviderFeatureEntity>,
        @InjectMapper() mapper: Mapper,
        private readonly configVersionService: ConfigVersionService,
        @Inject(forwardRef(() => FeatureRunnerRegistry))
        private readonly runnerRegistry: FeatureRunnerRegistry,
    ) {
        super(dataProviderFeatureRepository, mapper, DataProviderFeatureDto, DataProviderFeatureService.name);
    }

    async createFeature(dataProviderId: string, request: CreateDataProviderFeatureRequestDto): Promise<DataProviderFeatureDto> {
        const existing = await this.exists({ dataProviderId, type: request.type });
        if (existing) {
            throw new BadRequestException(`Feature ${request.type} already exists for data provider ${dataProviderId}`);
        }

        const entity = this.dataProviderFeatureRepository.create({
            dataProviderId,
            type: request.type,
            service: request.service || 'generic',
            config: request.config,
            status: DataProviderFeatureStatus.UNCONFIGURED,
        });

        return await super.create(entity);
    }

    async updateFeatureConfig(id: string, request: UpdateFeatureConfigRequestDto, user?: PayloadDto): Promise<DataProviderFeatureDto> {
        const feature = await this.findById(id);
        if (!feature) {
            throw new NotFoundException(`Feature with ID ${id} not found`);
        }

        // Create version snapshot
        await this.configVersionService.create(
            {
                featureId: id,
                config: request.config,
                isActive: true,
                changeType: ConfigVersionType.MANUAL_EDIT,
                changeDescription: request.changeDescription || 'Updated feature configuration',
            },
            user,
        );

        const newStatus = feature.status === DataProviderFeatureStatus.UNCONFIGURED ? DataProviderFeatureStatus.TESTING : feature.status;

        await super.update(id, {
            config: request.config,
            service: request.service ?? feature.service,
            status: newStatus,
        });

        return await this.findById(id);
    }

    async switchStatus(id: string, status: DataProviderFeatureStatus): Promise<boolean> {
        if (status === DataProviderFeatureStatus.UNCONFIGURED) {
            throw new BadRequestException('Not allowed to switch status to UNCONFIGURED');
        }

        const feature = await this.dataProviderFeatureRepository.findOne({
            where: { id },
            relations: { dataProvider: true },
        });

        if (!feature) {
            throw new NotFoundException(`Feature with ID ${id} not found`);
        }

        if (status === DataProviderFeatureStatus.READY) {
            if (feature.status !== DataProviderFeatureStatus.TESTING) {
                throw new BadRequestException('Not allowed to switch status to READY unless currently TESTING');
            }

            const runner = this.runnerRegistry.getRunner(feature.type);
            await runner.testContextual(feature);
        } else if (status === DataProviderFeatureStatus.TESTING) {
            if (feature.status !== DataProviderFeatureStatus.READY && feature.status !== DataProviderFeatureStatus.DISABLED) {
                throw new BadRequestException('Not allowed to switch status to TESTING from current state');
            }
        }

        return await super.update(id, { status });
    }

    async testFeature(id: string, input?: any): Promise<any> {
        const feature = await this.dataProviderFeatureRepository.findOne({
            where: { id },
            relations: { dataProvider: true },
        });

        if (!feature) {
            throw new NotFoundException(`Feature with ID ${id} not found`);
        }

        const runner = this.runnerRegistry.getRunner(feature.type);
        return await runner.testContextual(feature, input);
    }

    async getFeaturesByProviderId(dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return (await this.findListByFilter({ dataProviderId })) as DataProviderFeatureDto[];
    }

    async getFeatureByProviderIdAndType(dataProviderId: string, type: DataProviderFeatureType): Promise<DataProviderFeatureDto> {
        const feature = await this.findOneByFilter({ dataProviderId, type });
        if (!feature) {
            throw new NotFoundException(`Feature ${type} not found for data provider ${dataProviderId}`);
        }
        return feature;
    }
}
