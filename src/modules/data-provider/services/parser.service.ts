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
        const { url, dataContent, ...targetConfig } = request;

        if (!url && !dataContent) throw new BadRequestException('URL or Data content is required');

        const dataProviderScraperService = this.dataProviderScraperServiceMap[request.scraperService];
        if (!dataProviderScraperService) throw new BadRequestException(`Scraper service ${request.scraperService} not found`);

        const extractData = await dataProviderScraperService.getExtractData({
            dataContent,
            targetConfig: targetConfig as ITargetConfig,
        });

        return extractData;
    }
}
