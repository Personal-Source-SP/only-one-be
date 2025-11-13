import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { SCRAPING_DATA_PAGINATION_CONFIG } from '../constants/scraping-data.config';
import { ScrapingDataDto } from '../dtos/scraping-data.dto';
import { ProcessScrapeDataRequestDto } from '../dtos/requests';
import { ProcessScrapeDataResponse } from '../dtos/responses';
import { ScrapingDataEntity } from '../entities/scraping-data.entity';
import { ScrapingDataService } from '../services/scraping-data.service';

@ApiTags('Scraping Data')
@Controller('scraping-data')
export class ScrapingDataController extends BaseController<ScrapingDataEntity, ScrapingDataDto> {
    constructor(private readonly scrapingDataService: ScrapingDataService) {
        super(scrapingDataService, SCRAPING_DATA_PAGINATION_CONFIG, { enableDeleteMany: true });
    }

    @ApiOperation({ summary: 'Process scrape data' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('process-scrape-data')
    @BaseApiOkResponse(ProcessScrapeDataResponse)
    public async processScrapeData(@Body() request: ProcessScrapeDataRequestDto): Promise<ProcessScrapeDataResponse> {
        const result = await this.scrapingDataService.processScrapeData(request);
        return result;
    }
}
