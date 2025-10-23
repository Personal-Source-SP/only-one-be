import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { ScrapeItemDataResponseDto } from '../dtos/responses/scrape-item-data-response.dto';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { IScraperRequest } from './scraper.interface';
import { ITargetConfig } from './target-config.interface';

export interface IGetExtractDataRequest {
    targetConfig: ITargetConfig;
    htmlContentString?: string;
    requestOptions?: IScraperRequest;
    dataContent?: Record<string, any>;
}

export interface IExtractDataResponse {
    html?: string;
    error?: string;
    data?: Record<string, any>;
}

export interface IScrapeItemDataRequest {
    dataProviderItem: DataProviderItemEntity;
}

export interface IValidateParserFunctionRequest {
    targetConfig: ITargetConfig;
    productUrl?: string;
}

export interface IDataProviderScraperService {
    getExtractData(request: IGetExtractDataRequest): Promise<IExtractDataResponse>;
    scrapeItemData(request: IScrapeItemDataRequest): Promise<ScrapeItemDataResponseDto>;
    validateParserFunction(request: IValidateParserFunctionRequest): Promise<ValidateParserFunctionResponseDto>;
}
