import { ProcessSearchDataResponse } from '../../data-provider/dtos/responses';
import { ScheduleJobEventType } from '../../schedule/enums';
import { SearchWorkerProcessor } from '../processors/search-worker.processor';

describe('SearchWorkerProcessor', () => {
    let processor: SearchWorkerProcessor;
    let draftItemService: any;
    let scheduleJobEventService: any;

    beforeEach(() => {
        draftItemService = {
            processSearchData: jest.fn(),
        };

        scheduleJobEventService = {
            update: jest.fn().mockResolvedValue(true),
        };

        processor = new SearchWorkerProcessor(draftItemService, scheduleJobEventService);
    });

    it('TC-03: Search Worker Processor Execution & Event Lifecycle', async () => {
        const mockResponse = new ProcessSearchDataResponse({
            process: 1,
            success: 1,
            error: 0,
            totalDraftsCreated: 5,
        });

        draftItemService.processSearchData.mockResolvedValue(mockResponse);

        const mockJob: any = {
            id: 'job-bull-1',
            attemptsMade: 0,
            opts: { attempts: 1 },
            data: {
                scheduleJobId: 'sched-job-1',
                scheduleJobEventId: 'event-1',
                request: { dataProviderIds: ['dp-1'], searchQueries: ['laptop'] },
            },
        };

        const result = await processor.process(mockJob);

        expect(result).toEqual(mockResponse);
        expect(draftItemService.processSearchData).toHaveBeenCalledWith({
            dataProviderIds: ['dp-1'],
            searchQueries: ['laptop'],
        });

        await processor.onCompleted(mockJob, mockResponse);
        expect(scheduleJobEventService.update).toHaveBeenCalledWith(
            'event-1',
            expect.objectContaining({
                eventType: ScheduleJobEventType.COMPLETED,
            }),
        );
    });
});
