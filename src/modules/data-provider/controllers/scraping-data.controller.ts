import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Post } from '../../../decorators';
import { SCRAPING_DATA_PAGINATION_CONFIG } from '../constants/scraping-data.config';
import { ProcessScrapeDataRequestDto } from '../dtos/requests';
import { ProcessScrapeDataResponse } from '../dtos/responses';
import { ScrapingDataDto } from '../dtos/scraping-data.dto';
import { ScrapingDataEntity } from '../entities/scraping-data.entity';
import { ScrapingDataService } from '../services/scraping-data.service';

@ApiTags('Scraping Data')
@Controller('scraping-data')
export class ScrapingDataController extends BaseController<ScrapingDataEntity, ScrapingDataDto> {
    constructor(private readonly scrapingDataService: ScrapingDataService) {
        super(scrapingDataService, SCRAPING_DATA_PAGINATION_CONFIG, { enableDeleteMany: true });
    }

    @Post({
        path: 'process-scrape-data',
        summary: 'Process scrape data',
        responseDto: ProcessScrapeDataResponse,
    })
    async processScrapeData(@Body() request: ProcessScrapeDataRequestDto): Promise<ProcessScrapeDataResponse> {
        const result = await this.scrapingDataService.processScrapeData(request);
        return result;
    }
}
