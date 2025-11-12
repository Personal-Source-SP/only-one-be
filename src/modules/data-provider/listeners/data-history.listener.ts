import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { DATA_HISTORY_EVENTS } from '../constants/data-history-event.config';
import { ProcessScrapeDataRequestDto } from '../dtos/requests';
import { DataHistoryService } from '../services/data-history.service';

@Injectable()
export class DataHistoryListener {
    private readonly loggerService: LoggerService = new LoggerService(DataHistoryListener.name);

    public constructor(private readonly dataHistoryService: DataHistoryService) {
        this.loggerService.log('DataHistoryListener created');
    }

    @OnEvent(DATA_HISTORY_EVENTS.PROCESS_SCRAPE_DATA, { async: true })
    async processScrapeData(request: ProcessScrapeDataRequestDto): Promise<void> {
        try {
            this.loggerService.log(`Starting process scrape data: ${request}`);
            const response = await this.dataHistoryService.processScrapeData(request);
            this.loggerService.log(`Successfully processed scrape data: ${response}`);
        } catch (error) {
            this.loggerService.error(`Failed to process scrape data: ${error?.message}`);
        }
    }
}
