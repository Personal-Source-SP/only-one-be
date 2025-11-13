import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { SCRAPING_DATA_EVENTS } from '../constants/scraping-data-event.config';
import { ProcessScrapeDataRequestDto } from '../dtos/requests';
import { ScrapingDataService } from '../services/scraping-data.service';

@Injectable()
export class ScrapingDataListener {
    private readonly loggerService: LoggerService = new LoggerService(ScrapingDataListener.name);

    public constructor(private readonly scrapingDataService: ScrapingDataService) {
        this.loggerService.log('ScrapingDataListener created');
    }

    @OnEvent(SCRAPING_DATA_EVENTS.PROCESS_SCRAPE_DATA, { async: true })
    async processScrapeData(request: ProcessScrapeDataRequestDto): Promise<void> {
        try {
            this.loggerService.log(`Starting process scrape data: ${request}`);
            const response = await this.scrapingDataService.processScrapeData(request);
            this.loggerService.log(`Successfully processed scrape data: ${response}`);
        } catch (error) {
            this.loggerService.error(`Failed to process scrape data: ${error?.message}`);
        }
    }
}
