import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { AppException } from '../../../exceptions/app.exception';
import { NOTIFICATION_EVENTS } from '../../notification/constants/notification.constant';
import { NotificationType } from '../../notification/enum/notification.enum';
import { DataProviderError } from '../constants/data-provider-error';
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
        @Inject(forwardRef(() => FeatureRunnerRegistry))
        private readonly runnerRegistry: FeatureRunnerRegistry,
        @InjectRepository(DataProviderFeatureEntity)
        private readonly dataProviderFeatureRepository: Repository<DataProviderFeatureEntity>,
    ) {
        super(dataProviderFeatureRepository, mapper, DataProviderFeatureDto, DataProviderFeatureService.name);
    }

    async createFeature(dataProviderId: string, request: CreateDataProviderFeatureRequestDto): Promise<DataProviderFeatureDto> {
        const existing = await this.exists({ dataProviderId, type: request.type });
        if (existing) throw new AppException(DataProviderError.FeatureAlreadyExists(request.type, dataProviderId));

        if (request.input) {
            const runner = this.runnerRegistry.getRunner(request.type);
            await runner.testStateless(request.service, request.config, request.input);
        }

        const status = request.input ? DataProviderFeatureStatus.READY : DataProviderFeatureStatus.UNCONFIGURED;
        const entity = this.dataProviderFeatureRepository.create({
            status,
            dataProviderId,
            type: request.type,
            config: request.config,
            service: request.service,
        });

        const created = await super.create(entity);
        return created;
    }

    async updateFeatureConfig(id: string, request: UpdateFeatureConfigRequestDto, user?: PayloadDto): Promise<DataProviderFeatureDto> {
        const feature = await this.findById(id);
        if (!feature) throw new AppException(DataProviderError.FeatureNotFound(id));

        if (request.input) {
            const runner = this.runnerRegistry.getRunner(feature.type);
            await runner.testStateless(feature.service, request.config, request.input);
        }

        // Create version snapshot
        await this.configVersionService.create(
            {
                featureId: id,
                isActive: true,
                config: request.config,
                changeType: ConfigVersionType.MANUAL_EDIT,
                changeDescription: request.changeDescription,
            },
            user,
        );

        const newStatus = [DataProviderFeatureStatus.UNCONFIGURED, DataProviderFeatureStatus.ERROR].includes(feature.status)
            ? DataProviderFeatureStatus.TESTING
            : feature.status;

        await super.update(id, {
            status: newStatus,
            lastErrorType: null,
            consecutiveFailures: 0,
            lastErrorMessage: null,
            config: request.config,
        });

        const updated = await this.findById(id);
        return updated;
    }

    async recordFeatureFailure(
        id: string,
        errorMessage: string,
        errorType: DataProviderFeatureErrorType = DataProviderFeatureErrorType.TRANSIENT,
    ): Promise<void> {
        const feature = await this.findOneByFilter({ id }, { relations: { dataProvider: true } });
        if (!feature) return;

        const consecutiveFailures = (feature.consecutiveFailures || 0) + 1;
        const isFatal = errorType === DataProviderFeatureErrorType.FATAL;
        const shouldTripCircuit = isFatal || consecutiveFailures >= DataProviderFeatureService.FAILURE_THRESHOLD;

        const updatePayload: Partial<DataProviderFeatureEntity> = {
            consecutiveFailures,
            lastErrorType: errorType,
            lastFailedRunAt: new Date(),
            lastErrorMessage: errorMessage,
        };

        if (shouldTripCircuit && feature.status !== DataProviderFeatureStatus.ERROR) {
            updatePayload.status = DataProviderFeatureStatus.ERROR;
            this.loggerService.error(`Feature ${feature.id} (${feature.type}) tripped circuit breaker to ERROR: ${errorMessage}`);

            // Emit Notification Event
            this.eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, {
                type: NotificationType.ERROR,
                title: `[DataProvider Error] Feature ${feature.type} disabled`,
                description: `Provider '${feature.dataProvider?.name || feature.dataProviderId}' feature ${feature.type} failed: ${errorMessage}`,
            });
        }

        await super.update(id, updatePayload);
    }

    async recordFeatureSuccess(id: string): Promise<void> {
        await super.update(id, {
            lastErrorType: null,
            consecutiveFailures: 0,
            lastErrorMessage: null,
            lastSuccessfulRunAt: new Date(),
        });
    }

    async switchStatus(id: string, status: DataProviderFeatureStatus): Promise<boolean> {
        if (status === DataProviderFeatureStatus.UNCONFIGURED) {
            throw new AppException(DataProviderError.InvalidStatusSwitchUnconfigured);
        }

        const feature = await this.findOneByFilter({ id }, { relations: { dataProvider: true } });
        if (!feature) throw new AppException(DataProviderError.FeatureNotFound(id));

        switch (status) {
            case DataProviderFeatureStatus.READY: {
                if (
                    ![DataProviderFeatureStatus.TESTING, DataProviderFeatureStatus.ERROR, DataProviderFeatureStatus.DISABLED].includes(
                        feature.status,
                    )
                ) {
                    throw new AppException(DataProviderError.InvalidStatusSwitchReady);
                }

                const runner = this.runnerRegistry.getRunner(feature.type);
                await runner.testContextual(feature as DataProviderFeatureEntity);

                const result = await super.update(id, {
                    status,
                    lastErrorType: null,
                    lastErrorMessage: null,
                    consecutiveFailures: 0,
                });

                return result;
            }

            case DataProviderFeatureStatus.TESTING: {
                if (
                    ![DataProviderFeatureStatus.READY, DataProviderFeatureStatus.DISABLED, DataProviderFeatureStatus.ERROR].includes(
                        feature.status,
                    )
                ) {
                    throw new AppException(DataProviderError.InvalidStatusSwitchTesting);
                }

                break;
            }

            default:
                break;
        }

        return await super.update(id, { status });
    }

    async getFeaturesByProviderId(dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.findListByFilter({ dataProviderId });
    }

    async getFeatureByProviderIdAndType(dataProviderId: string, type: DataProviderFeatureType): Promise<DataProviderFeatureDto> {
        const feature = await this.findOneByFilter({ dataProviderId, type });
        if (!feature) throw new AppException(DataProviderError.FeatureTypeNotFound(type, dataProviderId));

        return feature;
    }
}
