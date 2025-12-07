import { Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import * as path from 'path';
import { LocalFileService } from '../../../../shared/services/local-file.service';
import { ScrapeItemDataResponseDto, ScrapeItemDataResponseItemDto, ValidateParserFunctionResponseDto } from '../../dtos/responses';
import {
    IDataProviderScraperService,
    IExtractDataResponse,
    IGetExtractDataRequest,
    IScrapeItemDataRequest,
    ITargetConfig,
    IValidateParserFunctionRequest,
} from '../../interfaces';

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
                data = fileContent;
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

    private async getLocalFileContent(filePath: string): Promise<ScrapeItemDataResponseItemDto[]> {
        const isDirectory = await this.localFileService.isDirectory(filePath);
        if (!isDirectory) {
            throw new Error(`Path is not a directory: ${filePath}`);
        }

        const files = await this.localFileService.listDirectory(filePath);
        const dataList: ScrapeItemDataResponseItemDto[] = [];

        for (const fileName of files) {
            const fullPath = path.join(filePath, fileName);
            const isFileItem = await this.localFileService.isFile(fullPath);

            if (!isFileItem) {
                continue;
            }

            const ext = path.extname(fullPath).toLowerCase();
            if (!this.isImageOrVideo(ext)) {
                continue;
            }

            try {
                const fileStats = await this.localFileService.getFileStats(fullPath);
                const fileData: ScrapeItemDataResponseItemDto = {
                    id: fileName,
                    url: fullPath,
                    lastModified: fileStats.modifiedAt,
                    mimeType: this.getMimeTypeFromExtension(ext),
                };

                dataList.push(fileData);
            } catch (error) {
                continue;
            }
        }

        if (isEmpty(dataList)) {
            throw new Error(`No image or video files found in directory: ${filePath}`);
        }

        return dataList;
    }

    private isImageOrVideo(ext: string): boolean {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.tif'];
        const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.mpg', '.mpeg'];

        return imageExtensions.includes(ext) || videoExtensions.includes(ext);
    }

    private getMimeTypeFromExtension(ext: string): string {
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska',
            '.m4v': 'video/x-m4v',
            '.3gp': 'video/3gpp',
            '.mpg': 'video/mpeg',
            '.mpeg': 'video/mpeg',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}
