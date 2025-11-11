import { ProcessScrapeDataRequestDto } from '../../data-provider/dtos/requests';

export interface IScrapingJobQueueInterface {
    scheduleJobId: string;
    scheduleJobEventId: string;
    request: ProcessScrapeDataRequestDto;
}
