import { DataProviderDto } from '../dtos/data-provider.dto';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { ScrapeItemDataResponseDto, ScrapeItemDataResponseItemDto } from '../dtos/responses/scrape-item-data-response.dto';
import { IScrapingTargetConfig } from './target-config.interface';

export interface IGetExtractDataRequest {
    url: string;
    targetConfig: IScrapingTargetConfig;
    htmlContentString?: string;
    lastScrapedTimestamp?: Date;
    dataContent?: Record<string, unknown>;
}

export interface IExtractDataResponse {
    html?: string;
    error?: string;
    data?: ScrapeItemDataResponseItemDto[];
}

export interface IScrapeItemDataRequest {
    dataProvider: DataProviderDto;
    dataProviderItem: DataProviderItemDto;
}

export interface IValidateParserFunctionRequest {
    targetConfig: IScrapingTargetConfig;
    productUrl?: string;
}

export interface IDataProviderScraperService {
    getExtractData(request: IGetExtractDataRequest): Promise<IExtractDataResponse>;
    scrapeItemData(request: IScrapeItemDataRequest): Promise<ScrapeItemDataResponseDto>;
    validateParserFunction(request: IValidateParserFunctionRequest): Promise<ValidateParserFunctionResponseDto>;
}
