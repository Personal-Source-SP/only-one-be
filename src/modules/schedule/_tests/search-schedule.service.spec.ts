import { BadRequestException, NotFoundException } from '@nestjs/common';

import { DataProviderFeatureStatus, DataProviderFeatureType } from '../../data-provider/enums';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { ScheduleJobEventType, ScheduleType } from '../enums';
import { SearchScheduleService } from '../services/schedule-execution/search-schedule.service';

describe('SearchScheduleService', () => {
    let service: SearchScheduleService;
    let queueService: any;
    let dataProviderService: any;
    let scheduleJobEventService: any;

    beforeEach(() => {
        queueService = {
            addBulkJob: jest.fn().mockResolvedValue([{ id: 'bull-job-1' }]),
        };

        dataProviderService = {
            repository: {
                createQueryBuilder: jest.fn(),
            },
        };

        scheduleJobEventService = {
            repository: {
                create: jest.fn().mockImplementation((dto) => dto),
                save: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
            },
        };

        service = new SearchScheduleService(queueService, dataProviderService, scheduleJobEventService);
    });

    describe('addJob', () => {
        it('TC-01: Global Search Schedule Job Creation', async () => {
            const mockProviders = [
                {
                    id: 'dp-1',
                    name: 'Provider 1',
                    features: [{ id: 'feat-1', type: DataProviderFeatureType.SEARCH, status: DataProviderFeatureStatus.READY }],
                },
            ];

            const mockQueryBuilder = {
                innerJoin: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockProviders),
            };
            dataProviderService.repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.addJob({
                scheduleJobId: 'job-1',
                scheduleType: ScheduleType.GLOBAL,
                jobPayload: { searchQueries: ['iphone'] },
            });

            expect(result).toBe(true);
            expect(queueService.addBulkJob).toHaveBeenCalledWith(
                QUEUE_NAME.SEARCH_JOB,
                expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.objectContaining({
                            scheduleJobId: 'job-1',
                            request: expect.objectContaining({
                                dataProviderIds: ['dp-1'],
                                searchQueries: ['iphone'],
                            }),
                        }),
                    }),
                ]),
            );
            expect(scheduleJobEventService.repository.save).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        scheduleJobId: 'job-1',
                        eventType: ScheduleJobEventType.PENDING,
                    }),
                ]),
            );
        });

        it('TC-02: No Active Search Data Providers Error Handling', async () => {
            const mockQueryBuilder = {
                innerJoin: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            dataProviderService.repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await expect(
                service.addJob({
                    scheduleJobId: 'job-2',
                    scheduleType: ScheduleType.GLOBAL,
                    jobPayload: {},
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
