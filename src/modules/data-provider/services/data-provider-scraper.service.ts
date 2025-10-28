import { Inject, Injectable } from '@nestjs/common';

import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { ScrapeItemDataResponseDto } from '../dtos/responses/scrape-item-data-response.dto';
import { DataProviderStatus } from '../enums';
import { IDataProviderScraperService, ITargetConfig } from '../interfaces';
import { DataProviderItemService } from './data-provider-item.service';

@Injectable()
export class DataProviderScraperService {
    constructor(
        private readonly dataProviderItemService: DataProviderItemService,

        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
    ) {}

    async scrapeItemData(dataProviderItemId: string): Promise<ScrapeItemDataResponseDto> {
        const dataProviderItem = await this.dataProviderItemService.findOneByFilter({
            id: dataProviderItemId,
        });

        if (!dataProviderItem) {
            return new ScrapeItemDataResponseDto({
                status: 'error',
                dataProviderItemId,
                error: 'Data provider item not found',
                itemUrl: dataProviderItem.itemUrl,
            });
        }

        const dataProvider = dataProviderItem.dataProvider;
        if (dataProvider.status !== DataProviderStatus.READY) {
            return new ScrapeItemDataResponseDto({
                status: 'error',
                dataProviderItemId,
                dataProviderId: dataProvider.id,
                itemUrl: dataProviderItem.itemUrl,
                error: 'Data provider is not ready',
            });
        }

        const targetConfig = dataProvider?.targetConfig;
        if (!targetConfig) {
            return new ScrapeItemDataResponseDto({
                status: 'error',
                dataProviderItemId,
                dataProviderId: dataProvider.id,
                error: 'Target config not found',
                itemUrl: dataProviderItem.itemUrl,
            });
        }

        const dataProviderScraperService = this.dataProviderScraperServiceMap[dataProvider.scraperService];
        if (!dataProviderScraperService) {
            return new ScrapeItemDataResponseDto({
                status: 'error',
                dataProviderItemId,
                dataProviderId: dataProvider.id,
                itemUrl: dataProviderItem.itemUrl,
                error: `${dataProvider.scraperService} service not found`,
            });
        }

        return await dataProviderScraperService.scrapeItemData({ dataProvider, dataProviderItem });
    }

    async validateParserFunction(dto: {
        itemUrl: string;
        scraperService: string;
        targetConfig: ITargetConfig;
    }): Promise<ValidateParserFunctionResponseDto> {
        const { scraperService, targetConfig, itemUrl } = dto;

        const dataProviderScraperService = this.dataProviderScraperServiceMap[scraperService];
        if (!dataProviderScraperService) {
            return new ValidateParserFunctionResponseDto({
                status: 'error',
                error: `${scraperService} service not found`,
            });
        }

        return await dataProviderScraperService.validateParserFunction({ targetConfig, productUrl: itemUrl });
    }
}
