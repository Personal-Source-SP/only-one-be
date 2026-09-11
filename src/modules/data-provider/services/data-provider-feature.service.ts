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
import {
    CreateDataProviderFeatureRequestDto,
    TestFeatureStatelessRequestDto,
    UpdateFeatureConfigRequestDto,
} from '../dtos/requests/data-provider-feature-request.dto';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DataProviderFeatureErrorType, DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
import { ConfigVersionType } from '../enums/config-version-type.enum';
import { IExtractDataResponse, ISearchExtractDataResponse } from '../interfaces';
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

    async createFeature(request: CreateDataProviderFeatureRequestDto): Promise<DataProviderFeatureDto> {
        const { dataProviderId, type, service, config, input } = request;

        const existing = await this.exists({ dataProviderId, type });
        if (existing) throw new AppException(DataProviderError.FeatureAlreadyExists(type, dataProviderId));

        const runner = this.runnerRegistry.getRunner(type);
        const validatedConfig = config ? runner.validateConfig(config) : undefined;

        if (input) {
            await runner.testStateless(service, validatedConfig, input);
        }

        const status = input ? DataProviderFeatureStatus.READY : DataProviderFeatureStatus.UNCONFIGURED;
        const entity = this.dataProviderFeatureRepository.create({
            type,
            status,
            service,
            dataProviderId,
            config: validatedConfig,
        });

        const created = await super.create(entity);
        return created;
    }

    async updateFeature(id: string, request: UpdateFeatureConfigRequestDto, user?: PayloadDto): Promise<DataProviderFeatureDto> {
        const feature = await this.findById(id);
        if (!feature) throw new AppException(DataProviderError.FeatureNotFound(id));

        const runner = this.runnerRegistry.getRunner(feature.type);
        const validatedConfig = request.config ? runner.validateConfig(request.config) : undefined;

        if (request.input) {
            await runner.testStateless(feature.service, validatedConfig, request.input);
        }

        // Create version snapshot
        if (validatedConfig) {
            await this.configVersionService.create(
                {
                    featureId: id,
                    isActive: true,
                    config: validatedConfig,
                    changeType: ConfigVersionType.MANUAL_EDIT,
                    changeDescription: request.changeDescription,
                },
                user,
            );
        }

        const newStatus = [DataProviderFeatureStatus.UNCONFIGURED, DataProviderFeatureStatus.ERROR].includes(feature.status)
            ? DataProviderFeatureStatus.TESTING
            : feature.status;

        await super.update(id, {
            status: newStatus,
            lastErrorType: null,
            consecutiveFailures: 0,
            lastErrorMessage: null,
            config: validatedConfig,
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

    async getByProviderId(dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.findListByFilter({ dataProviderId });
    }

    async getByProviderIdAndType(dataProviderId: string, type: DataProviderFeatureType): Promise<DataProviderFeatureDto> {
        const feature = await this.findOneByFilter({ dataProviderId, type });
        if (!feature) throw new AppException(DataProviderError.FeatureTypeNotFound(type, dataProviderId));

        return feature;
    }

    async testStateless(request: TestFeatureStatelessRequestDto): Promise<IExtractDataResponse | ISearchExtractDataResponse> {
        const runner = this.runnerRegistry.getRunner(request.type);
        const result = (await runner.testStateless(request.service, request.config, request.input)) as
            | IExtractDataResponse
            | ISearchExtractDataResponse;

        if (result && Array.isArray(result.data)) {
            result.data = result.data.slice(0, 3);
        }

        return result;
    }
}
