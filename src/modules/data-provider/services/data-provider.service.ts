import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { IFindOptions } from '../../../common/interfaces/base-service.interface';
import { DataProviderDto } from '../dtos/data-provider.dto';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import {
    CreateDataProviderRequestDto,
    UpdateDataProviderRequestDto,
    UpdateSearchConfigRequestDto,
    UpdateTargetConfigRequestDto,
} from '../dtos/requests';
import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderSearchStatus, DataProviderStatus, ScraperServiceEnum } from '../enums';
import { ITargetConfig } from '../interfaces/target-config.interface';
import { ConfigVersionService } from './config-version.service';
import { DataProviderItemService } from './data-provider-item.service';
import { DataProviderScraperService } from './data-provider-scraper.service';

@Injectable()
export class DataProviderService extends BaseService<DataProviderEntity, DataProviderDto> {
    constructor(
        private readonly configVersionService: ConfigVersionService,

        @InjectMapper() mapper: Mapper,
        @InjectRepository(DataProviderEntity) dataProviderRepository: Repository<DataProviderEntity>,

        @Inject(forwardRef(() => DataProviderItemService))
        private readonly dataProviderItemService: DataProviderItemService,

        @Inject(forwardRef(() => DataProviderScraperService))
        private readonly dataProviderScraperService: DataProviderScraperService,
    ) {
        super(dataProviderRepository, mapper, DataProviderDto, DataProviderService.name);
    }

    async findById(id: string, options?: IFindOptions<DataProviderEntity>): Promise<DataProviderDto> {
        return await super.findById(id, options);
    }

    async create(data: CreateDataProviderRequestDto): Promise<DataProviderDto> {
        if (data?.identifier && !/^[a-z0-9-]+$/.test(data.identifier)) {
            throw new BadRequestException('Identifier must contain lowercase letters, numbers, and dashes');
        }

        if (data?.baseUrl) {
            const existingDataProviderWithBaseUrl = await this.exists({ baseUrl: data.baseUrl });

            if (existingDataProviderWithBaseUrl) {
                this.loggerService.error(`Data provider with baseUrl ${data.baseUrl} already exists`);
                throw new ConflictException(`Data provider with baseUrl ${data.baseUrl} already exists`);
            }
        }

        if (data?.identifier) {
            const existingDataProviderWithIdentifier = await this.exists({ identifier: data.identifier });

            if (existingDataProviderWithIdentifier) {
                this.loggerService.error(`Data provider with identifier ${data.identifier} already exists`);
                throw new ConflictException(`Data provider with identifier ${data.identifier} already exists`);
            }
        }

        const entity = this.mapper.map(data, CreateDataProviderRequestDto, DataProviderEntity);

        return await super.create(entity);
    }

    async update(id: string, data: UpdateDataProviderRequestDto): Promise<boolean> {
        const existingDataProvider = await this.findById(id);
        if (!existingDataProvider) {
            this.loggerService.error(`Data provider with ID ${id} not found`);
            throw new NotFoundException(`Data provider with ID ${id} not found`);
        }

        // Check if identifier is valid
        if (data?.identifier && !/^[a-z0-9-]+$/.test(data.identifier)) {
            throw new BadRequestException('Identifier must contain lowercase letters, numbers, and dashes');
        }

        // Check unique identifier
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

            // Update item URL if base URL is changed
            if (existingDataProvider.baseUrl !== data.baseUrl) {
                await this.dataProviderItemService.updateItemUrlByDataProviderId(id, data.baseUrl);
            }
        }

        return await super.update(id, data);
    }

    async updateTargetConfig(id: string, request: UpdateTargetConfigRequestDto): Promise<boolean> {
        const dataProvider = await this.findById(id);
        if (!dataProvider) throw new NotFoundException(`Data provider with ID ${id} not found`);

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

        const newStatus = dataProvider.status === DataProviderStatus.UNCONFIGURED ? DataProviderStatus.TESTING : dataProvider.status;

        return await super.update(id, {
            targetConfig,
            status: newStatus,
            scraperService: request.scraperService || undefined,
        });
    }

    async rollBackConfigVersion(id: string, versionId: number, user: PayloadDto): Promise<boolean> {
        const dataProvider = await this.findById(id);
        if (!dataProvider) throw new NotFoundException(`Data provider with ID ${id} not found`);

        const product = await this.getProviderItemRandom(id);
        const configVersion = await this.configVersionService.findOneByFilter({
            versionId,
            dataProviderId: id,
        });

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

        return await super.update(id, { targetConfig: configVersion.targetConfig });
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

                const product = await this.getProviderItemRandom(id);
                const validateParserFunction = await this.validateTargetConfig({
                    itemUrl: product.itemUrl,
                    targetConfig: dataProvider?.targetConfig,
                    scraperService: dataProvider?.scraperService,
                });

                if (validateParserFunction.status !== 'success') {
                    throw new BadRequestException(validateParserFunction?.error ?? 'Function parser is not valid');
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

        return await super.update(id, { status });
    }

    private async getProviderItemRandom(dataProviderId: string): Promise<DataProviderItemDto> {
        const dataProviderItem = await this.dataProviderItemService.findOneByFilterAndOptions({ dataProviderId }, { isRandom: true });
        if (!dataProviderItem) throw new BadRequestException('Data provider item not found for validation');

        return dataProviderItem;
    }

    private async validateTargetConfig(data: {
        itemUrl: string;
        scraperService: string;
        targetConfig: ITargetConfig;
    }): Promise<ValidateParserFunctionResponseDto> {
        const { scraperService, targetConfig, itemUrl } = data;
        if (!targetConfig) throw new BadRequestException('Target config not found');

        const requiredProperties: Array<keyof ITargetConfig> = [];
        switch (scraperService) {
            case ScraperServiceEnum.API: {
                requiredProperties.push('functionGenerator');
                break;
            }
            case ScraperServiceEnum.GENERIC: {
                requiredProperties.push('functionGenerator', 'mainContentSelector', 'isGetParentElement');
                break;
            }
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

    async updateSearchConfig(id: string, request: UpdateSearchConfigRequestDto): Promise<boolean> {
        const dataProvider = await this.findById(id);
        if (!dataProvider) {
            throw new NotFoundException(`Data provider with ID ${id} not found`);
        }

        const searchStatus =
            request.enableSearch !== false && request.searchConfig ? DataProviderSearchStatus.READY : DataProviderSearchStatus.UNCONFIGURED;

        const result = await super.update(id, {
            searchConfig: request.searchConfig,
            searchStatus,
        });
        return result;
    }
}
