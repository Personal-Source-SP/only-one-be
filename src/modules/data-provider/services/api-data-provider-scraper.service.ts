import { Injectable } from '@nestjs/common';
import { parsePrice } from '../../worker/helpers/price-parser';
import { ScrapeItemDataResponseDto, ValidateParserFunctionResponseDto } from '../dtos/responses';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { ExtractDataHelper } from '../helpers/extract-data.helper';
import { IDataProviderScraperService, IExtractDataResponse, IScraperRequest, ITargetConfig } from '../interfaces';
import { ScraperService } from './scraper.service';

@Injectable()
export class ApiDataProviderScraperService implements IDataProviderScraperService {
    constructor(
        private readonly scraperService: ScraperService,
        private readonly extractDataHelper: ExtractDataHelper,
    ) {}

    async scrapeItemData(dataProviderItem: DataProviderItemEntity): Promise<ScrapeItemDataResponseDto> {
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
            url: dataProviderItem.itemUrl,
        };

        try {
            const extractData = await this.getExtractData(targetConfig, requestOptions);
            if (extractData?.error) {
                return new ScrapeItemDataResponseDto({
                    ...defaultResponse,
                    error: extractData.error,
                    request: requestOptions,
                });
            }

            return new ScrapeItemDataResponseDto({
                ...defaultResponse,
                status: 'success',
                html: extractData.html,
                image: extractData.image,
                request: requestOptions,
                extractedDataResult: extractData.data,
            });
        } catch (error) {
            console.error(error);
            return new ScrapeItemDataResponseDto({
                ...defaultResponse,
                request: requestOptions,
                error: error?.message || 'Unknown error',
            });
        }
    }

    async validateParserFunction(productUrl: string, targetConfig: ITargetConfig): Promise<ValidateParserFunctionResponseDto> {
        const requestOptions: IScraperRequest = {
            url: productUrl,
        };

        try {
            const extractData = await this.getExtractData(targetConfig, requestOptions);
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

    async getExtractData(
        targetConfig: ITargetConfig,
        requestOptions?: IScraperRequest,
        htmlContentString?: string,
    ): Promise<IExtractDataResponse> {
        try {
            // Get html content if not provided
            let html = htmlContentString;
            if (!html) {
                const htmlContent = await this.scraperService.getHtmlContent(requestOptions);
                if (htmlContent.status !== 'success') {
                    return { error: htmlContent.error_message || `Not found html content from ${requestOptions.url}` };
                }

                html = htmlContent.html;
            }

            const extractData = await this.extractDataHelper.runFunctionExtractData({
                htmlContent: html,
                functionGenerator: targetConfig.functionGenerator,
                isGetParentElement: targetConfig.isGetParentElement,
                mainContentSelector: targetConfig.mainContentSelector,
            });

            if (!extractData) {
                return { error: 'Not found extract data' };
            }

            return { data: extractData, html };
        } catch (error) {
            console.error(error);
            return { error: error?.message || 'Unknown error' };
        }
    }
}
