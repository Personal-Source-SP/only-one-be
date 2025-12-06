import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { isEmpty } from 'lodash';
import { ScrapeItemDataResponseDto, ValidateParserFunctionResponseDto } from '../../dtos/responses';
import {
    IDataProviderScraperService,
    IExtractDataResponse,
    IGetExtractDataRequest,
    IScrapeItemDataRequest,
    ITargetConfig,
    IValidateParserFunctionRequest,
} from '../../interfaces';
import { IScraperResponse } from '../../interfaces/scraper.interface';
import { LocalFileService } from '../../../../shared/services/local-file.service';

@Injectable()
export class LocalDataProviderScraperService implements IDataProviderScraperService {
    constructor(private readonly localFileService: LocalFileService) {}

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
            const extractData = await this.getExtractData({
                targetConfig,
                url: dataProviderItem.itemUrl,
                lastScrapedTimestamp: dataProviderItem.lastScrapedTimestamp,
            });

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

        try {
            const extractData = await this.getExtractData({ targetConfig, url: productUrl });
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
        const { targetConfig, dataContent, url } = request;
        const { maxResults } = targetConfig;

        try {
            let data = dataContent;
            if (!data) {
                const fileContent = await this.getLocalFileContent(url);
                if (fileContent.status !== 'success') {
                    return { error: fileContent.error_message || `Not found data content from ${url}` };
                }
                data = fileContent.data;
            }

            const extractData = Array.isArray(data) ? data : [data];

            if (isEmpty(extractData)) {
                return { error: 'Not found extract data' };
            }

            if (maxResults && extractData.length > maxResults) {
                return { data: extractData.slice(0, maxResults) };
            }

            return { data: extractData };
        } catch (error) {
            console.error(error);
            return { error: error?.message || 'Unknown error' };
        }
    }

    private async getLocalFileContent(filePath: string): Promise<IScraperResponse> {
        const startTime = Date.now();

        try {
            const fileExists = await this.localFileService.fileExists(filePath);
            if (!fileExists) {
                return {
                    status: 'error',
                    execution_time: Date.now() - startTime,
                    error_code: 'FILE_NOT_FOUND',
                    error_message: `File not found: ${filePath}`,
                };
            }

            const isFile = await this.localFileService.isFile(filePath);
            if (!isFile) {
                return {
                    status: 'error',
                    execution_time: Date.now() - startTime,
                    error_code: 'NOT_A_FILE',
                    error_message: `Path is not a file: ${filePath}`,
                };
            }

            const ext = path.extname(filePath).toLowerCase();
            let data: Record<string, any>;

            if (ext === '.json') {
                try {
                    data = await this.localFileService.readFileAsJson(filePath);
                } catch (parseError) {
                    return {
                        status: 'error',
                        execution_time: Date.now() - startTime,
                        error_code: 'INVALID_JSON',
                        error_message: `Failed to parse JSON file: ${parseError?.message}`,
                    };
                }
            } else {
                const fileContent = await this.localFileService.readFile(filePath, { encoding: 'utf-8' });
                data = { content: fileContent as string };
            }

            return {
                status: 'success',
                data,
                execution_time: Date.now() - startTime,
            };
        } catch (error) {
            return {
                status: 'error',
                execution_time: Date.now() - startTime,
                error_code: error?.name || 'UNKNOWN_ERROR',
                error_message: error?.message || 'Unknown error',
            };
        }
    }
}
