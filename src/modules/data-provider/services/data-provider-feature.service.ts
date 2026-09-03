import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { NOTIFICATION_EVENTS } from '../../notification/constants/notification.constant';
import { NotificationType } from '../../notification/enum/notification.enum';
import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
import { CreateDataProviderFeatureRequestDto, UpdateFeatureConfigRequestDto } from '../dtos/requests/data-provider-feature-request.dto';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DataProviderFeatureErrorType, DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
import { ConfigVersionType } from '../enums/config-version-type.enum';
import { FeatureRunnerRegistry } from '../runners/feature-runner.registry';
import { ConfigVersionService } from './config-version.service';

@Injectable()
export class DataProviderFeatureService extends BaseService<DataProviderFeatureEntity, DataProviderFeatureDto> {
    public static readonly FAILURE_THRESHOLD = 3;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly configVersionService: ConfigVersionService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(DataProviderFeatureEntity)
        private readonly dataProviderFeatureRepository: Repository<DataProviderFeatureEntity>,
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
            service: request.service || ScraperServiceEnum.GENERIC,
            config: request.config,
            consecutiveFailures: 0,
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

        const newStatus =
            feature.status === DataProviderFeatureStatus.UNCONFIGURED || feature.status === DataProviderFeatureStatus.ERROR
                ? DataProviderFeatureStatus.TESTING
                : feature.status;

        await super.update(id, {
            config: request.config,
            service: request.service ?? feature.service,
            status: newStatus,
            consecutiveFailures: 0,
            lastErrorMessage: null,
            lastErrorType: null,
        });

        return await this.findById(id);
    }

    async recordFeatureFailure(
        id: string,
        errorMessage: string,
        errorType: DataProviderFeatureErrorType = DataProviderFeatureErrorType.TRANSIENT,
    ): Promise<void> {
        const feature = await this.dataProviderFeatureRepository.findOne({
            where: { id },
            relations: { dataProvider: true },
        });
        if (!feature) return;

        const consecutiveFailures = (feature.consecutiveFailures || 0) + 1;
        const isFatal = errorType === DataProviderFeatureErrorType.FATAL;
        const shouldTripCircuit = isFatal || consecutiveFailures >= DataProviderFeatureService.FAILURE_THRESHOLD;

        const updatePayload: Partial<DataProviderFeatureEntity> = {
            consecutiveFailures,
            lastErrorMessage: errorMessage,
            lastErrorType: errorType,
            lastFailedRunAt: new Date(),
        };

        if (shouldTripCircuit && feature.status !== DataProviderFeatureStatus.ERROR) {
            updatePayload.status = DataProviderFeatureStatus.ERROR;
            this.loggerService.error(`Feature ${feature.id} (${feature.type}) tripped circuit breaker to ERROR: ${errorMessage}`);

            // Emit Notification Event
            this.eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, {
                title: `[DataProvider Error] Feature ${feature.type} disabled`,
                description: `Provider '${feature.dataProvider?.name || feature.dataProviderId}' feature ${feature.type} failed: ${errorMessage}`,
                type: NotificationType.ERROR,
            });
        }

        await this.dataProviderFeatureRepository.update(id, updatePayload);
    }

    async recordFeatureSuccess(id: string): Promise<void> {
        await this.dataProviderFeatureRepository.update(id, {
            consecutiveFailures: 0,
            lastErrorMessage: null,
            lastErrorType: null,
            lastSuccessfulRunAt: new Date(),
        });
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
            if (feature.status !== DataProviderFeatureStatus.TESTING && feature.status !== DataProviderFeatureStatus.ERROR) {
                throw new BadRequestException('Not allowed to switch status to READY unless currently TESTING or ERROR');
            }

            const runner = this.runnerRegistry.getRunner(feature.type);
            await runner.testContextual(feature);

            return await super.update(id, {
                status,
                consecutiveFailures: 0,
                lastErrorMessage: null,
                lastErrorType: null,
            });
        } else if (status === DataProviderFeatureStatus.TESTING) {
            if (
                feature.status !== DataProviderFeatureStatus.READY &&
                feature.status !== DataProviderFeatureStatus.DISABLED &&
                feature.status !== DataProviderFeatureStatus.ERROR
            ) {
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
