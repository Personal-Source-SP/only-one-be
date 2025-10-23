import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DATA_PROVIDER_SCRAPER_SERVICE_MAP } from '../constants/data-provider-scraper-service-map';
import { TestParserFunctionRequestDto } from '../dtos/requests';
import { ExtractDataHelper } from '../helpers/extract-data.helper';
import { IDataProviderScraperService } from '../interfaces';

@Injectable()
export class ParserService {
    constructor(
        private readonly extractDataHelper: ExtractDataHelper,
        @Inject(DATA_PROVIDER_SCRAPER_SERVICE_MAP)
        private readonly dataProviderScraperServiceMap: Record<string, IDataProviderScraperService>,
    ) {}

    async handleTestParserFunctionRequest(request: TestParserFunctionRequestDto): Promise<Record<string, any>> {
        if (!request.url && !request.htmlContentString) throw new BadRequestException('URL or HTML content is required');

        const dataProviderScraperService = this.dataProviderScraperServiceMap[request.scraperService];
        if (!dataProviderScraperService) throw new BadRequestException(`Scraper service ${request.scraperService} not found`);

        const extractData = await this.extractDataHelper.runFunctionExtractData({
            htmlContent: request.htmlContentString,
            functionGenerator: request.targetConfig.functionGenerator,
            mainContentSelector: request.targetConfig.mainContentSelector,
            isGetParentElement: request.targetConfig.isGetParentElement,
        });

        return extractData;
    }
}
