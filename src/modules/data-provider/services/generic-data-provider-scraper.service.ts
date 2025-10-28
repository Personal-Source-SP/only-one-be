import { Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { parsePrice } from '../../worker/helpers/price-parser';
import { ScrapeItemDataResponseDto, ValidateParserFunctionResponseDto } from '../dtos/responses';
import { ExtractDataHelper } from '../helpers/extract-data.helper';
import {
    IDataProviderScraperService,
    IExtractDataResponse,
    IGetExtractDataRequest,
    IScrapeItemDataRequest,
    ITargetConfig,
    IValidateParserFunctionRequest,
} from '../interfaces';
import { ScraperService } from './scraper.service';

@Injectable()
export class GenericDataProviderScraperService implements IDataProviderScraperService {
    constructor(
        private readonly scraperService: ScraperService,
        private readonly extractDataHelper: ExtractDataHelper,
    ) {}

    async scrapeItemData(request: IScrapeItemDataRequest): Promise<ScrapeItemDataResponseDto> {
        const { dataProvider, dataProviderItem } = request;

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
            request: targetConfig,
            dataProviderId: dataProvider.id,
            itemUrl: dataProviderItem.itemUrl,
            dataProviderItemId: dataProviderItem.id,
        });

        try {
            const extractData = await this.getExtractData({ targetConfig, url: dataProviderItem.itemUrl });
            if (extractData?.error) {
                return new ScrapeItemDataResponseDto({
                    ...defaultResponse,
                    error: extractData.error,
                });
            }

            return new ScrapeItemDataResponseDto({
                ...defaultResponse,
                status: 'success',
                html: extractData.html,
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

        try {
            const extractData = await this.getExtractData({ targetConfig, url: productUrl });
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
        const { targetConfig, url, htmlContentString } = request;
        const { functionGenerator, mainContentSelector, isGetParentElement, maxResults } = targetConfig;

        try {
            // Get html content if not provided
            let html = htmlContentString;
            if (!html) {
                const htmlContent = await this.scraperService.getHtmlContent(url, targetConfig);
                if (htmlContent.status !== 'success') {
                    return { error: htmlContent.error_message || `Not found html content from ${url}` };
                }

                html = htmlContent.html;
            }

            const extractData = await this.extractDataHelper.runFunctionExtractData({
                htmlContent: html,
                functionGenerator,
                isGetParentElement,
                mainContentSelector,
            });

            if (isEmpty(extractData)) {
                return { error: 'Not found extract data' };
            }

            if (maxResults && extractData.length > maxResults) {
                return { data: extractData.slice(0, maxResults) };
            }

            return { data: extractData, html };
        } catch (error) {
            console.error(error);
            return { error: error?.message || 'Unknown error' };
        }
    }
}
