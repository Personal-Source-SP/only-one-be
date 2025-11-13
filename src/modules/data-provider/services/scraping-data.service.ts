import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { MimeType } from '../../../common/enums/mime-type';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { ScrapingDataDto } from '../dtos/scraping-data.dto';
import { ProcessScrapeDataRequestDto } from '../dtos/requests';
import { ProcessDataProviderItemResponse, ProcessScrapeDataProviderResponse, ProcessScrapeDataResponse } from '../dtos/responses';
import { ScrapingDataEntity } from '../entities/scraping-data.entity';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderStatus } from '../enums';
import { IDataProviderScraperService } from '../interfaces';
import { DataProviderService } from './data-provider.service';

@Injectable()
export class ScrapingDataService extends BaseService<ScrapingDataEntity, ScrapingDataDto> {
    constructor(
        private readonly dataProviderService: DataProviderService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScrapingDataEntity) scrapingDataRepository: Repository<ScrapingDataEntity>,
        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
    ) {
        super(scrapingDataRepository, mapper, ScrapingDataDto, ScrapingDataService.name);
    }

    async processScrapeData(request: ProcessScrapeDataRequestDto): Promise<ProcessScrapeDataResponse> {
        const dataProviders = await this.getDataProvidersForScrape(request);
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
            const dataProviderResponse = await this.processScrapeDataProvider(dataProvider);
            if (dataProviderResponse?.errors?.length) {
                response.error++;
                response.errors.push(...dataProviderResponse.errors);
            } else {
                response.success++;
                response.successData.push(...dataProviderResponse.successData);
            }
        }

        const validatedResponse = await this.validateResponseForScrape(request, response);
        const scrapingDataEntities: ScrapingDataEntity[] = validatedResponse.successData.map((successData) => {
            return this.repository.create({
                scrapeTimestamp: new Date(),
                metadata: successData.data,
                dataId: successData.dataId,
                type: successData.mimeType,
                url: successData.url,
                lastModified: successData.lastModified,
                dataProviderId: successData.dataProviderId,
                dataProviderItemId: successData.dataProviderItemId,
            });
        });

        if (!scrapingDataEntities.length) {
            return new ProcessScrapeDataResponse({
                process: 0,
                success: 0,
                error: 0,
                errorsMessage: 'No scraping data entities to save',
            });
        }

        const savedScrapingDataEntities = await this.createMany(scrapingDataEntities);
        if (!savedScrapingDataEntities.length) {
            return new ProcessScrapeDataResponse({
                process: 0,
                success: 0,
                error: 0,
                errorsMessage: 'Failed to save scraping data',
            });
        }

        return validatedResponse;
    }

    async processScrapeDataProvider(dataProvider: DataProviderEntity): Promise<ProcessScrapeDataProviderResponse> {
        const response = new ProcessScrapeDataProviderResponse({
            success: 0,
            error: 0,
            errors: [],
            successData: [],
        });

        const dataProviderScraperService = this.dataProviderScraperServiceMap[dataProvider.scraperService];
        if (!dataProviderScraperService) {
            response.error++;
            response.errors.push({
                dataProviderName: dataProvider.name,
                errorMessage: `Scraper service ${dataProvider.scraperService} not found`,
            });

            return response;
        }

        for (const dataProviderItem of dataProvider.dataProviderItems) {
            const itemExtractData = await this.processDataProviderItem(dataProvider, dataProviderItem, dataProviderScraperService);

            if (itemExtractData.status !== 'success') {
                response.error++;
                response.errors.push({
                    dataProviderName: dataProvider.name,
                    errorMessage: itemExtractData.errorMessage,
                    dataProviderItemUrl: dataProviderItem.itemUrl,
                });
            } else {
                response.success++;

                const data = itemExtractData.data;
                data?.forEach((item) => {
                    if (!item?.id || !item?.mimeType || !item?.url) {
                        return;
                    }

                    response.successData.push({
                        dataProviderId: dataProvider.id,
                        dataProviderName: dataProvider.name,
                        dataProviderItemId: dataProviderItem.id,
                        dataProviderItemUrl: dataProviderItem.itemUrl,
                        data: item,
                        url: item.url,
                        dataId: item.id,
                        mimeType: item.mimeType,
                        lastModified: item?.lastModified || new Date(),
                    });
                });
            }
        }

        return response;
    }

    async getDataProvidersForScrape(request: ProcessScrapeDataRequestDto): Promise<DataProviderEntity[]> {
        const { dataProviderIds, dataProviderItemIds, itemIds } = request;

        const builder = this.dataProviderService.repository
            .createQueryBuilder('dataProvider')
            .leftJoinAndSelect('dataProvider.parent', 'parent')
            .leftJoinAndSelect('dataProvider.dataProviderItems', 'dataProviderItem')
            .leftJoinAndSelect('dataProviderItem.item', 'item')
            .where('dataProvider.status = :status', { status: DataProviderStatus.READY })
            .andWhere('dataProviderItem.isActive = :isActive', { isActive: true });

        if (dataProviderIds?.length) {
            builder.andWhere('dataProvider.id IN (:...dataProviderIds)', { dataProviderIds });
        }

        if (dataProviderItemIds?.length) {
            builder.andWhere('dataProviderItem.id IN (:...dataProviderItemIds)', { dataProviderItemIds });
        }

        if (itemIds?.length) {
            builder.andWhere('item.id IN (:...itemIds)', { itemIds });
        }

        try {
            const dataProviders = await builder.getMany();
            return dataProviders;
        } catch (error) {
            this.loggerService.error(`Failed to get data providers for scrape: ${error?.message}`);
            return [];
        }
    }

    async validateResponseForScrape(
        request: ProcessScrapeDataRequestDto,
        response: ProcessScrapeDataResponse,
    ): Promise<ProcessScrapeDataResponse> {
        const { checkDuplicateData, mimeTypes } = request;

        let successData = [...(response?.successData ?? [])];

        if (checkDuplicateData) {
            const dataIds = successData.map((successData) => successData.dataId);
            const duplicateData = await this.findListByFilter({ dataId: In(dataIds) }, { select: { dataId: true }, withDeleted: true });

            const duplicateDataIds = duplicateData.map((entity) => entity.dataId);
            const successDataWithoutDuplicate = successData.filter((successData) => !duplicateDataIds.includes(String(successData.dataId)));
            successData = successDataWithoutDuplicate;
        }

        if (mimeTypes?.length) {
            const successDataWithoutMimeType = successData.filter((successData) => mimeTypes.includes(successData.mimeType as MimeType));
            successData = successDataWithoutMimeType;
        }

        return new ProcessScrapeDataResponse({
            ...response,
            successData,
        });
    }

    private async processDataProviderItem(
        dataProvider: DataProviderEntity,
        dataProviderItem: DataProviderItemEntity,
        dataProviderScraperService: IDataProviderScraperService,
    ): Promise<ProcessDataProviderItemResponse> {
        try {
            const itemExtractData = await dataProviderScraperService.scrapeItemData({ dataProviderItem, dataProvider });
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
