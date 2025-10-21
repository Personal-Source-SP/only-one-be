import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { ScrapeItemDataResponseDto } from '../dtos/responses/scrape-item-data-response.dto';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { IScraperRequest } from './scraper.interface';
import { ITargetConfig } from './target-config.interface';

export interface IExtractDataResponse {
    html?: string;
    image?: string;
    error?: string;
    data?: Record<string, any>;
}

export interface IScrapeHtmlContentRequest {
    url: string;
    targetConfig: ITargetConfig;
    marketConfig?: Record<string, any>;
}

export interface IScrapeHtmlContentResponse {
    html?: string;
    error?: string;
}

export interface IExtractContentResponse {
    success: boolean;
    url: string;
    dataProviderId?: string;
    content?: {
        title?: string;
        description?: string;
        content: string;
        provider: 'defuddle' | 'article-extractor';
    };
    error?: string;
    metadata?: {
        scrapingDuration: number;
        extractionDuration: number;
        totalDuration: number;
        contentLength: number;
        provider: string;
    };
}

export interface IDataProviderScraperService {
    scrapeItemData(dataProviderItem: DataProviderItemEntity): Promise<ScrapeItemDataResponseDto>;
    validateParserFunction(productUrl: string, targetConfig: ITargetConfig): Promise<ValidateParserFunctionResponseDto>;
    getExtractData(targetConfig: ITargetConfig, requestOptions?: IScraperRequest, htmlContent?: string): Promise<IExtractDataResponse>;
}
