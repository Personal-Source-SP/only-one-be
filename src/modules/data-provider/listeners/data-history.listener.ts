import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { DATA_HISTORY_EVENTS } from '../constants/data-history-event.config';
import { ProcessScrapeDataRequestDto } from '../dtos/requests';
import { DataHistoryService } from '../services/data-history.service';

@Injectable()
export class DataHistoryListener {
    public constructor(
        private readonly logger: LoggerService,
        private readonly dataHistoryService: DataHistoryService,
    ) {
        this.logger.log('DataHistoryListener created');
    }

    @OnEvent(DATA_HISTORY_EVENTS.PROCESS_SCRAPE_DATA, { async: true })
    async processScrapeData(request: ProcessScrapeDataRequestDto): Promise<void> {
        try {
            this.logger.log(`[DataHistoryListener] Starting process scrape data: ${request}`);

            const response = await this.dataHistoryService.processScrapeData(request);

            this.logger.log(`[DataHistoryListener] Successfully processed scrape data: ${response}`);
        } catch (error) {
            this.logger.error(`[DataHistoryListener] Failed to process scrape data: ${error?.message}`);
        }
    }
}
