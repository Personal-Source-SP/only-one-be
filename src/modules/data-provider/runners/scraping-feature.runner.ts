import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../enums';
import { TargetConfigValidatorHelper } from '../helpers/target-config-validator.helper';
import { FeatureTestInput, IDataProviderScraperService, IExtractDataResponse, IFeatureRunner, IScrapingTargetConfig } from '../interfaces';
import { DataProviderItemService } from '../services/data-provider-item.service';

@Injectable()
export class ScrapingFeatureRunner
    implements IFeatureRunner<IScrapingTargetConfig, FeatureTestInput, IExtractDataResponse | ValidateParserFunctionResponseDto>
{
    constructor(
        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
        @Inject(forwardRef(() => DataProviderItemService))
        private readonly dataProviderItemService: DataProviderItemService,
    ) {}

    validateConfig(config: unknown): IScrapingTargetConfig {
        return TargetConfigValidatorHelper.validateScrapingTargetConfig(config);
    }

    async testStateless(
        service: ScraperServiceEnum,
        config: IScrapingTargetConfig,
        input: FeatureTestInput,
    ): Promise<IExtractDataResponse> {
        const targetConfig = this.validateConfig(config);
        const { url, dataContent, htmlContentString } = input || {};
        if (!url && !dataContent && !htmlContentString) throw new AppException(DataProviderError.MissingTestInput);

        const scraperService = this.dataProviderScraperServiceMap[service];
        if (!scraperService) throw new AppException(DataProviderError.ScraperServiceNotFound(service));

        const result = await scraperService.getExtractData({
            url,
            dataContent,
            targetConfig,
            htmlContentString,
        });
        if (result.error) throw new AppException(DataProviderError.FeatureTestFailed(result.error));

        return result;
    }

    async testContextual(feature: DataProviderFeatureEntity, input?: FeatureTestInput): Promise<ValidateParserFunctionResponseDto> {
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
            targetConfig: feature.config as IScrapingTargetConfig,
        });

        if (result.status !== 'success') {
            throw new AppException(DataProviderError.FeatureValidationFailed(result.error || 'Scraping validation failed'));
        }

        return result;
    }
}
