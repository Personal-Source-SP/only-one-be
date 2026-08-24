import { ProcessSearchDataRequestDto } from '../../data-provider/dtos/requests';

export interface ISearchJobQueueInterface {
    scheduleJobId: string;
    scheduleJobEventId: string;
    request: ProcessSearchDataRequestDto;
}
