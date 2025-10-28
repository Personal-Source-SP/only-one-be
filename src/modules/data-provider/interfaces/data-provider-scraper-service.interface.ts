import { ValidateParserFunctionResponseDto } from '../dtos/responses';
import { ScrapeItemDataResponseDto } from '../dtos/responses/scrape-item-data-response.dto';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { ITargetConfig } from './target-config.interface';

export interface IGetExtractDataRequest {
    url: string;
    targetConfig: ITargetConfig;
    htmlContentString?: string;
    dataContent?: Record<string, any>;
}

export interface IExtractDataResponse {
    html?: string;
    error?: string;
    data?: Record<string, any>;
}

export interface IScrapeItemDataRequest {
    dataProvider: DataProviderEntity;
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
