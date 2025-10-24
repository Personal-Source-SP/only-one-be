import { Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { ScrapeItemDataResponseDto, ValidateParserFunctionResponseDto } from '../dtos/responses';
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

        const requestOptions: IScraperRequest = {
            ...(targetConfig as unknown as IScraperRequest),
            url: dataProviderItem.itemUrl,
        };

        try {
            const extractData = await this.getExtractData({ targetConfig, requestOptions });
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
        const { targetConfig, productUrl } = request;

        const requestOptions: IScraperRequest = {
            ...(targetConfig as unknown as IScraperRequest),
            url: productUrl,
        };

        try {
            const extractData = await this.getExtractData({ targetConfig, requestOptions });
            if (extractData?.error) {
                return new ValidateParserFunctionResponseDto({
                    status: 'error',
                    error: extractData.error,
                });
            }

            if (isEmpty(extractData.data)) {
                return new ValidateParserFunctionResponseDto({
                    status: 'error',
                    error: 'Function parse data is not valid, cannot parse data',
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
        const { targetConfig, dataContent, requestOptions } = request;

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
