import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { IDataProviderScraperService, IExtractDataResponse, IFeatureRunner, ITargetConfig } from '../interfaces';
import { DataProviderItemService } from '../services/data-provider-item.service';

@Injectable()
export class ScrapingFeatureRunner implements IFeatureRunner<ITargetConfig, any, IExtractDataResponse | any> {
    constructor(
        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
        @Inject(forwardRef(() => DataProviderItemService))
        private readonly dataProviderItemService: DataProviderItemService,
    ) {}

    async testStateless(service: string, config: ITargetConfig, input: any): Promise<IExtractDataResponse> {
        const { url, dataContent, htmlContentString } = input || {};
        if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingTestInput);

        const scraperService = this.dataProviderScraperServiceMap[service];
        if (!scraperService) throw new AppException(DataProviderError.ScraperServiceNotFound(service));

        const result = await scraperService.getExtractData({
            url,
            dataContent,
            htmlContentString,
            targetConfig: config,
        });
        if (result.error) throw new AppException(DataProviderError.FeatureTestFailed(result.error));

        return result;
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<any> {
        let itemUrl = input?.itemUrl || input?.url;
        if (!itemUrl) {
            const randomItem = await this.dataProviderItemService.findOneByFilterAndOptions(
                { dataProviderId: feature.dataProviderId },
                { isRandom: true },
            );
            if (!randomItem) throw new AppException(DataProviderError.NoSampleItemFound);

            itemUrl = randomItem.itemUrl;
        }

        const scraperService = this.dataProviderScraperServiceMap[feature.service];
        if (!scraperService) throw new AppException(DataProviderError.ScraperServiceNotFound(feature.service));

        const result = await scraperService.validateParserFunction({
            productUrl: itemUrl,
            targetConfig: feature.config as ITargetConfig,
        });

        if (result.status !== 'success') {
            throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Scraping validation failed'));
        }

        return result;
    }
}
