import { Injectable } from '@nestjs/common';
import { parsePrice } from '../../worker/helpers/price-parser';
import { ScrapeItemDataResponseDto, ValidateParserFunctionResponseDto } from '../dtos/responses';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { ExtractDataHelper } from '../helpers/extract-data.helper';
import {
    IDataProviderScraperService,
    IExtractDataResponse,
    IGetExtractDataRequest,
    IScrapeItemDataRequest,
    IScraperRequest,
    ITargetConfig,
    IValidateParserFunctionRequest,
} from '../interfaces';
import { ScraperService } from './scraper.service';

@Injectable()
export class ApiDataProviderScraperService implements IDataProviderScraperService {
    constructor(
        private readonly scraperService: ScraperService,
        private readonly extractDataHelper: ExtractDataHelper,
    ) {}

    async scrapeItemData(request: IScrapeItemDataRequest): Promise<ScrapeItemDataResponseDto> {
        const { dataProviderItem } = request;

        const dataProvider = dataProviderItem.dataProvider;

        const targetConfig: ITargetConfig = dataProvider.targetConfig;
        if (!targetConfig) {
            return new ScrapeItemDataResponseDto({
                status: 'error',
                dataProviderId: dataProvider.id,
                itemUrl: dataProviderItem.itemUrl,
                dataProviderItemId: dataProviderItem.id,
                error: 'Target config is missing',
            });
        }

        const defaultResponse = new ScrapeItemDataResponseDto({
            status: 'error',
            dataProviderId: dataProvider.id,
            itemUrl: dataProviderItem.itemUrl,
            dataProviderItemId: dataProviderItem.id,
        });

        try {
            const extractData = await this.getExtractData({ targetConfig });
            if (extractData?.error) {
                return new ScrapeItemDataResponseDto({
                    ...defaultResponse,
                    error: extractData.error,
                });
            }

            return new ScrapeItemDataResponseDto({
                ...defaultResponse,
                status: 'success',
                extractedDataResult: extractData.data,
            });
        } catch (error) {
            console.error(error);
            return new ScrapeItemDataResponseDto({
                ...defaultResponse,
                error: error?.message || 'Unknown error',
            });
        }
    }

    async validateParserFunction(request: IValidateParserFunctionRequest): Promise<ValidateParserFunctionResponseDto> {
        const { targetConfig } = request;

        try {
            const extractData = await this.getExtractData({ targetConfig });
            if (extractData?.error) {
                return new ValidateParserFunctionResponseDto({
                    status: 'error',
                    error: extractData.error,
                });
            }

            if (!extractData.data?.productPrice) {
                return new ValidateParserFunctionResponseDto({
                    status: 'error',
                    error: 'Function parse price is not valid, cannot parse product price',
                });
            }

            const productPrice = parsePrice(extractData.data?.productPrice ?? 0);
            const regularPrice = parsePrice(extractData.data?.regularPrice ?? 0);

            if (productPrice <= 0 && regularPrice <= 0) {
                return new ValidateParserFunctionResponseDto({
                    status: 'error',
                    error: 'Parse price is not valid',
                });
            }

            return new ValidateParserFunctionResponseDto({
                status: 'success',
                data: extractData.data,
            });
        } catch (error) {
            console.error(error);
            return new ValidateParserFunctionResponseDto({
                status: 'error',
                error: error?.message || 'Unknown error',
            });
        }
    }

    async getExtractData(request: IGetExtractDataRequest): Promise<IExtractDataResponse> {
        const { targetConfig, requestOptions, dataContent } = request;

        try {
            // Get html content if not provided
            let data = dataContent;
            if (!data) {
                const dataContent = await this.scraperService.getApiContent(requestOptions);
                if (dataContent.status !== 'success') {
                    return { error: dataContent.error_message || `Not found data content from ${requestOptions.url}` };
                }

                data = dataContent.data;
            }

            const extractData = await this.extractDataHelper.runApiFunctionExtractData({
                data: data,
                functionGenerator: targetConfig.functionGenerator,
            });

            if (!extractData) {
                return { error: 'Not found extract data' };
            }

            return { data: extractData };
        } catch (error) {
            console.error(error);
            return { error: error?.message || 'Unknown error' };
        }
    }
}
