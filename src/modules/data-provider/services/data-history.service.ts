import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { In, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { DataHistoryDto } from '../dtos/data-history.dto';
import { CreateDataHistoryRequestDto, DataHistoryPaginationRequestDto, ProcessScrapeDataRequestDto } from '../dtos/requests';
import { ProcessDataProviderItemResponse, ProcessScrapeDataResponse } from '../dtos/responses';
import { DataHistoryEntity } from '../entities/data-history.entity';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderStatus } from '../enums';
import { IDataProviderScraperService } from '../interfaces';
import { DataProviderService } from './data-provider.service';

@Injectable()
export class DataHistoryService extends BaseService<DataHistoryEntity> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly dataProviderService: DataProviderService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(DataHistoryEntity)
        private readonly dataHistoryRepository: Repository<DataHistoryEntity>,

        @InjectRepository(DataProviderEntity)
        private readonly dataProviderRepository: Repository<DataProviderEntity>,

        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
    ) {
        super(dataHistoryRepository);
    }

    async getById(id: string): Promise<DataHistoryDto> {
        const dataHistory = await this.findById(id);
        if (!dataHistory) {
            this.loggerService.error(`No data history found with id ${id}`);
            return null;
        }

        return this.mapper.map(dataHistory, DataHistoryEntity, DataHistoryDto);
    }

    async getDataHistoryPagination(
        query: DataHistoryPaginationRequestDto,
        globalConfig: PaginateConfig<DataHistoryEntity>,
    ): Promise<Paginated<DataHistoryDto>> {
        try {
            const queryBuilder = this.dataHistoryRepository.createQueryBuilder('dataHistory');

            const paginatedResult: Paginated<DataHistoryEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                queryBuilder,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, DataHistoryEntity, DataHistoryDto);
            return { ...paginatedResult, data } as Paginated<DataHistoryDto>;
        } catch (error) {
            this.loggerService.error(`Get data history pagination error: ${error?.message}`);
            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async createDataHistory(request: CreateDataHistoryRequestDto): Promise<DataHistoryDto> {
        try {
            const dataHistoryEntity = this.mapper.map(request, CreateDataHistoryRequestDto, DataHistoryEntity);
            dataHistoryEntity.scrapeTimestamp = new Date();

            const dataHistory = await this.dataHistoryRepository.save(dataHistoryEntity);
            return this.mapper.map(dataHistory, DataHistoryEntity, DataHistoryDto);
        } catch (error) {
            this.loggerService.error(`Create data history error: ${error?.message}`);
            throw error;
        }
    }

    async deleteDataHistory(id: string): Promise<boolean> {
        const existingDataHistory = await this.exists({ id });
        if (!existingDataHistory) {
            this.loggerService.error(`No data history found with id ${id}`);
            throw new NotFoundException('No data history found with id');
        }

        return this.delete(id);
    }

    async processScrapeData(request: ProcessScrapeDataRequestDto): Promise<ProcessScrapeDataResponse> {
        const { dataProviderIds, lastScrapeTimestamp } = request;

        const builder = this.dataProviderRepository
            .createQueryBuilder('dataProvider')
            .leftJoinAndSelect('dataProvider.dataProviderItems', 'dataProviderItem')
            .where('dataProvider.status = :status', { status: DataProviderStatus.READY });

        if (dataProviderIds?.length) {
            builder.andWhere('dataProvider.id IN (:...dataProviderIds)', { dataProviderIds });
        }

        if (lastScrapeTimestamp) {
            builder.andWhere('dataProvider.lastScrapeTimestamp < :lastScrapeTimestamp', { lastScrapeTimestamp });
        }

        const dataProviders = await builder.getMany();
        if (!dataProviders.length) {
            this.loggerService.error('No data providers available to scrape');
            return new ProcessScrapeDataResponse({
                process: 0,
                success: 0,
                error: 0,
                errorsMessage: 'No data providers available to scrape',
            });
        }

        const response = new ProcessScrapeDataResponse({
            process: dataProviders.length,
            success: 0,
            error: 0,
            errors: [],
            successData: [],
        });

        for (const dataProvider of dataProviders) {
            const dataProviderScraperService = this.dataProviderScraperServiceMap[dataProvider.scraperService];
            if (!dataProviderScraperService) {
                response.error++;
                response.errors.push({
                    dataProviderId: dataProvider.id,
                    errorMessage: `Scraper service ${dataProvider.scraperService} not found`,
                });

                continue;
            }

            for (const dataProviderItem of dataProvider.dataProviderItems) {
                const itemExtractData = await this.processDataProviderItem(dataProviderItem, dataProviderScraperService);
                if (itemExtractData.status !== 'success') {
                    response.error++;
                    response.errors.push({
                        dataProviderId: dataProvider.id,
                        dataProviderItemId: dataProviderItem.id,
                        errorMessage: itemExtractData.errorMessage,
                    });
                } else {
                    response.success++;
                    response.successData.push({
                        dataProviderId: dataProvider.id,
                        dataProviderItemId: dataProviderItem.id,
                        data: itemExtractData.data,
                        type: itemExtractData?.data?.type || null,
                        url: itemExtractData?.data?.url || null,
                        lastModified: itemExtractData?.data?.lastModified || null,
                    });
                }
            }
        }

        let dataHistoryEntities: DataHistoryEntity[] = response.successData.map((successData) => {
            return this.dataHistoryRepository.create({
                scrapeTimestamp: new Date(),
                metadata: successData.data,
                dataId: successData?.data?.id || null,
                dataProviderItemId: successData.dataProviderItemId,
            });
        });

        if (request.checkDuplicateData) {
            const dataIds = dataHistoryEntities.map((entity) => entity.dataId);
            const duplicateData = await this.dataHistoryRepository.find({ where: { dataId: In(dataIds) }, select: ['dataId'] });

            const duplicateDataIds = duplicateData.map((entity) => entity.dataId);
            dataHistoryEntities = dataHistoryEntities.filter((entity) => !duplicateDataIds.includes(entity.dataId));
        }

        const savedDataHistoryEntities = await this.dataHistoryRepository.save(dataHistoryEntities);
        if (!savedDataHistoryEntities.length) {
            return new ProcessScrapeDataResponse({
                process: 0,
                success: 0,
                error: 0,
                errorsMessage: 'Failed to save data history',
            });
        }

        return response;
    }

    private async processDataProviderItem(
        dataProviderItem: DataProviderItemEntity,
        dataProviderScraperService: IDataProviderScraperService,
    ): Promise<ProcessDataProviderItemResponse> {
        try {
            const itemExtractData = await dataProviderScraperService.scrapeItemData({ dataProviderItem });
            if (itemExtractData.status !== 'success') {
                return new ProcessDataProviderItemResponse({
                    status: 'error',
                    errorMessage: itemExtractData?.error || 'Unknown error',
                });
            }

            return new ProcessDataProviderItemResponse({
                status: 'success',
                data: itemExtractData.extractedDataResult,
            });
        } catch (error) {
            return new ProcessDataProviderItemResponse({
                status: 'error',
                errorMessage: error?.message || 'Unknown error',
            });
        }
    }
}
