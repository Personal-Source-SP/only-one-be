import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { TestParserFunctionRequestDto } from '../dtos/requests';
import { IDataProviderScraperService, IExtractDataResponse, ITargetConfig } from '../interfaces';

@Injectable()
export class ParserService {
    constructor(
        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
    ) {}

    async testParserFunction(request: TestParserFunctionRequestDto): Promise<IExtractDataResponse> {
        const { url, dataContent, htmlContentString, scraperService } = request;
        if (!url && !dataContent && !htmlContentString) throw new BadRequestException('URL, Data content or Html content is required');

        const dataProviderScraperService = this.dataProviderScraperServiceMap[scraperService];
        if (!dataProviderScraperService) throw new BadRequestException(`Scraper service ${scraperService} not found`);

        const targetConfig: ITargetConfig = {
            functionGenerator: request.functionGenerator,
            mainContentSelector: request.mainContentSelector,
            isGetParentElement: request.isGetParentElement,
            queryParams: request.queryParams,
            maxResults: request.maxResults,
            retryDelay: request.retryDelay,
            retryAttempts: request.retryAttempts,
            userAgent: request.userAgent,
            headers: request.headers,
            cookies: request.cookies,
            stealthMode: request.stealthMode,
            cloudflareBypass: request.cloudflareBypass,
            waitForSelector: request.waitForSelector,
            javascriptEnabled: request.javascriptEnabled,
            imagesEnabled: request.imagesEnabled,
            cssEnabled: request.cssEnabled,
        };

        const extractData = await dataProviderScraperService.getExtractData({
            url,
            dataContent,
            targetConfig,
            htmlContentString,
        });

        return extractData;
    }
}
