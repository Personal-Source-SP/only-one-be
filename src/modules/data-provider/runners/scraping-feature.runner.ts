import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';

import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { IDataProviderScraperService, IExtractDataResponse, ITargetConfig } from '../interfaces';
import { DataProviderItemService } from '../services/data-provider-item.service';
import { IFeatureRunner } from './interfaces/feature-runner.interface';

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
        if (!url && !dataContent && !htmlContentString) {
            throw new BadRequestException('URL, Data content or Html content is required');
        }

        const scraperService = this.dataProviderScraperServiceMap[service];
        if (!scraperService) {
            throw new BadRequestException(`Scraper service '${service}' not found`);
        }

        return await scraperService.getExtractData({
            url,
            dataContent,
            targetConfig: config,
            htmlContentString,
        });
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: any): Promise<any> {
        let itemUrl = input?.itemUrl || input?.url;
        if (!itemUrl) {
            const randomItem = await this.dataProviderItemService.findOneByFilterAndOptions(
                { dataProviderId: feature.dataProviderId },
                { isRandom: true },
            );
            if (!randomItem) {
                throw new BadRequestException('No sample data provider item found to test contextual scraping');
            }
            itemUrl = randomItem.itemUrl;
        }

        const scraperService = this.dataProviderScraperServiceMap[feature.service];
        if (!scraperService) {
            throw new BadRequestException(`Scraper service '${feature.service}' not found`);
        }

        const result = await scraperService.validateParserFunction({
            targetConfig: feature.config as ITargetConfig,
            productUrl: itemUrl,
        });

        if (result.status !== 'success') {
            throw new BadRequestException(result.error || 'Scraping validation failed');
        }

        return result;
    }
}
