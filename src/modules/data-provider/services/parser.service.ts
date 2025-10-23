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
        const { url, dataContent, htmlContentString, ...targetConfig } = request;

        if (!url && !dataContent && !htmlContentString) throw new BadRequestException('URL, Data content or Html content is required');

        const dataProviderScraperService = this.dataProviderScraperServiceMap[request.scraperService];
        if (!dataProviderScraperService) throw new BadRequestException(`Scraper service ${request.scraperService} not found`);

        const extractData = await dataProviderScraperService.getExtractData({
            dataContent,
            htmlContentString,
            targetConfig: targetConfig as ITargetConfig,
            requestOptions: {
                url,
                ...targetConfig,
            },
        });

        return extractData;
    }
}
