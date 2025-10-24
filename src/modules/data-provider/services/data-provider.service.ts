import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { DataProviderDto } from '../dtos/data-provider.dto';
import {
    CreateDataProviderRequestDto,
    DataProviderPaginationRequestDto,
    UpdateDataProviderRequestDto,
    UpdateTargetConfigRequestDto,
} from '../dtos/requests';
import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderStatus, ScraperServiceEnum } from '../enums';
import { ITargetConfig } from '../interfaces/target-config.interface';
import { ConfigVersionService } from './config-version.service';
import { DataProviderItemService } from './data-provider-item.service';
import { DataProviderScraperService } from './data-provider-scraper.service';

@Injectable()
export class DataProviderService extends BaseService<DataProviderEntity> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly configVersionService: ConfigVersionService,

        @Inject(forwardRef(() => DataProviderItemService))
        private readonly dataProviderItemService: DataProviderItemService,

        @Inject(forwardRef(() => DataProviderScraperService))
        private readonly dataProviderScraperService: DataProviderScraperService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(DataProviderEntity)
        private readonly dataProviderRepository: Repository<DataProviderEntity>,
    ) {
        super(dataProviderRepository);
    }

    async getById(id: string): Promise<DataProviderDto> {
        const dataProvider = await this.dataProviderRepository.findOne({
            where: { id },
        });

        return this.mapper.map(dataProvider, DataProviderEntity, DataProviderDto);
    }

    async getAll(): Promise<DataProviderDto[]> {
        const dataProviders = await this.findAll();
        return this.mapper.mapArray(dataProviders, DataProviderEntity, DataProviderDto);
    }

    async getDataProvidersPagination(
        query: DataProviderPaginationRequestDto,
        globalConfig: PaginateConfig<DataProviderEntity>,
    ): Promise<Paginated<DataProviderDto>> {
        try {
            const paginatedResult: Paginated<DataProviderEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                this.dataProviderRepository,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, DataProviderEntity, DataProviderDto);
            return { ...paginatedResult, data } as Paginated<DataProviderDto>;
        } catch (error) {
            this.loggerService.error(`Get data providers pagination error: ${error?.message}`);

            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async createDataProvider(data: CreateDataProviderRequestDto): Promise<DataProviderDto> {
        // Check if identifier is valid
        if (data?.identifier && !/^[a-z0-9-]+$/.test(data.identifier)) {
            throw new BadRequestException('Identifier must contain lowercase letters, numbers, and dashes');
        }

        // Check if baseUrl exists
        if (data?.baseUrl) {
            // Remove trailing slashes from baseUrl
            data.baseUrl = this.removeTrailingSlashes(data.baseUrl);

            const existingDataProviderWithBaseUrl = await this.exists({
                baseUrl: data.baseUrl,
            });

            if (existingDataProviderWithBaseUrl) {
                this.loggerService.error(`Data provider with baseUrl ${data.baseUrl} already exists`);
                throw new ConflictException(`Data provider with baseUrl ${data.baseUrl} already exists`);
            }
        }

        try {
            const dataProvider = this.mapper.map(data, CreateDataProviderRequestDto, DataProviderEntity);
            const savedDataProvider = await this.create(dataProvider);

            return this.mapper.map(savedDataProvider, DataProviderEntity, DataProviderDto);
        } catch (error) {
            this.loggerService.error(`Create data provider error: ${error?.message}`);
            throw error;
        }
    }

    async updateDataProvider(id: string, data: UpdateDataProviderRequestDto): Promise<boolean> {
        const existingDataProvider = await this.findById(id);
        if (!existingDataProvider) {
            this.loggerService.error(`Data provider with ID ${id} not found`);
            throw new NotFoundException(`Data provider with ID ${id} not found`);
        }

        // Check if identifier is valid
        if (data?.identifier && !/^[a-z0-9-]+$/.test(data.identifier)) {
            throw new BadRequestException('Identifier must contain lowercase letters, numbers, and dashes');
        }

        // Check unique identifier for root data provider
        if (data?.identifier) {
            const countExistingDataProvider = await this.exists({
                id: Not(id),
                identifier: data.identifier,
            });

            if (countExistingDataProvider) {
                this.loggerService.error(`Data provider with identifier ${data.identifier} already exists`);
                throw new ConflictException(`Data provider with identifier ${data.identifier} already exists`);
            }
        }

        // Check unique baseUrl
        if (data?.baseUrl) {
            const existingDataProviderWithBaseUrl = await this.exists({
                id: Not(id),
                baseUrl: data.baseUrl,
            });

            if (existingDataProviderWithBaseUrl) {
                this.loggerService.error(`Data provider with baseUrl ${data.baseUrl} already exists`);
                throw new ConflictException(`Data provider with baseUrl ${data.baseUrl} already exists`);
            }
        }

        try {
            const dataProvider = this.mapper.map(data, UpdateDataProviderRequestDto, DataProviderEntity);
            const result = await this.update(id, dataProvider);

            return result;
        } catch (error) {
            this.loggerService.error(`Update data provider error: ${error?.message}`);
            throw new BadRequestException(error?.message);
        }
    }

    async updateTargetConfig(id: string, request: UpdateTargetConfigRequestDto): Promise<boolean> {
        const dataProviderEntity = await this.findOneByFilter({ id });

        if (!dataProviderEntity) {
            throw new NotFoundException(`Data provider with ID ${id} not found or is not a parent data provider`);
        }

        const { scraperService, ...targetConfig } = request;

        const product = await this.getProviderItemRandom(id);
        const validateParserFunction = await this.validateTargetConfig({
            scraperService,
            itemUrl: product.itemUrl,
            targetConfig: targetConfig as ITargetConfig,
        });

        if (validateParserFunction.status !== 'success') {
            throw new BadRequestException(validateParserFunction?.error ?? 'Function parser is not valid');
        }

        try {
            const oldStatus = dataProviderEntity.status;
            let newStatus = oldStatus;

            if (oldStatus === DataProviderStatus.UNCONFIGURED) {
                newStatus = DataProviderStatus.TESTING;
            }

            const result = await this.update(id, {
                targetConfig,
                status: newStatus,
                scraperService: request.scraperService || undefined,
            });

            return result;
        } catch (error) {
            this.loggerService.error(`Update target config error: ${error?.message}`);
            throw error;
        }
    }

    async deleteDataProvider(id: string): Promise<boolean> {
        const dataProvider = await this.findById(id);
        if (!dataProvider) throw new NotFoundException(`Data provider with ID ${id} not found`);

        const result = await this.delete(id);
        return result;
    }

    async rollBackConfigVersion(id: string, versionId: number, user: PayloadDto): Promise<boolean> {
        const dataProvider = await this.findById(id);
        if (!dataProvider) throw new NotFoundException(`Data provider with ID ${id} not found`);

        const product = await this.getProviderItemRandom(id);
        const configVersion = await this.configVersionService.getByVersionId(id, versionId);

        const validateParserFunction = await this.validateTargetConfig({
            itemUrl: product.itemUrl,
            targetConfig: configVersion.targetConfig,
            scraperService: dataProvider.scraperService,
        });

        if (validateParserFunction.status !== 'success') {
            throw new BadRequestException(validateParserFunction?.error ?? 'Function parser is not valid');
        }

        const isRollback = await this.configVersionService.rollbackToVersionId(id, versionId, user);
        if (!isRollback) throw new BadRequestException('Rollback failed');

        const isUpdatedTargetConfig = await this.update(id, {
            targetConfig: configVersion.targetConfig,
        });

        return isUpdatedTargetConfig;
    }

    async switchStatus(id: string, status: DataProviderStatus): Promise<boolean> {
        if (status === DataProviderStatus.UNCONFIGURED) {
            throw new BadRequestException('Not allowed to switch status to UNCONFIGURED');
        }

        const dataProvider = await this.findById(id);
        if (!dataProvider) throw new BadRequestException(`No data provider found with ID ${id}`);

        switch (status) {
            case DataProviderStatus.READY: {
                if (dataProvider.status !== DataProviderStatus.TESTING) {
                    throw new BadRequestException('Not allowed to switch status to READY');
                }
                break;
            }

            case DataProviderStatus.TESTING: {
                if (dataProvider.status !== DataProviderStatus.READY) {
                    throw new BadRequestException('Not allowed to switch status to TESTING');
                }
                break;
            }
        }

        const result = await this.update(id, { status });

        return result;
    }

    private removeTrailingSlashes(url: string): string {
        return url.trim().replace(/[\\/]+$/, '');
    }

    private async getProviderItemRandom(dataProviderId: string, relations?: string[]): Promise<DataProviderItemEntity> {
        const dataProviderItem = await this.dataProviderItemService.getOneByFilter(
            {
                dataProviderId,
            },
            { isRandom: true, relations },
        );

        if (!dataProviderItem) {
            throw new BadRequestException('Mapping item not found for validation');
        }

        return dataProviderItem;
    }

    private async validateTargetConfig(data: {
        itemUrl: string;
        scraperService: string;
        targetConfig: ITargetConfig;
    }): Promise<ValidateParserFunctionResponseDto> {
        const { scraperService, targetConfig, itemUrl } = data;
        if (!targetConfig) throw new BadRequestException('Target config not found');

        const requiredProperties: Array<keyof ITargetConfig> = ['functionGenerator'];
        if (scraperService === ScraperServiceEnum.GENERIC) {
            requiredProperties.push('mainContentSelector', 'isGetParentElement');
        }

        const missingProperties: Array<keyof ITargetConfig> = requiredProperties.filter((prop) => !(prop in targetConfig));
        if (missingProperties.length) {
            throw new BadRequestException(`Target config is missing required properties: ${missingProperties.join(', ')}`);
        }

        const response = await this.dataProviderScraperService.validateParserFunction({
            scraperService,
            targetConfig,
            itemUrl,
        });

        return response;
    }
}
