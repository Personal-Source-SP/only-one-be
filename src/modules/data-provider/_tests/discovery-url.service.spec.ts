import { DiscoveryUrlService } from '../services/discovery-url.service';

describe('DiscoveryUrlService', () => {
    let service: DiscoveryUrlService;
    let urlRepo: any;
    let sessionRepo: any;
    let logRepo: any;
    let mapper: any;
    let dataSource: any;

    beforeEach(() => {
        urlRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn().mockResolvedValue(2),
        };

        sessionRepo = {
            findOne: jest.fn().mockResolvedValue({ id: 'session-1' }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        logRepo = {
            find: jest.fn().mockResolvedValue([]),
        };

        mapper = {
            map: jest.fn().mockImplementation((e: any) => e),
            mapArray: jest.fn().mockImplementation((a: any) => a),
        };

        dataSource = {
            transaction: jest.fn().mockImplementation(async (cb) => {
                return await cb({
                    find: jest.fn().mockResolvedValue([
                        { id: 'url-1', dataProviderId: 'dp-1', url: 'https://example.com/p1' },
                        { id: 'url-2', dataProviderId: 'dp-1', url: 'https://example.com/p2' },
                    ]),
                    update: jest.fn().mockResolvedValue({ affected: 2 }),
                    create: jest.fn().mockImplementation((_: any, dto: any) => dto),
                    save: jest.fn().mockResolvedValue([]),
                    count: jest.fn().mockResolvedValue(2),
                });
            }),
        };

        service = new DiscoveryUrlService(urlRepo, sessionRepo, logRepo, mapper, dataSource);
    });

    it('should batch enqueue URLs into scraping queue and update session totalQueued', async () => {
        const result = await service.batchEnqueue('session-1', ['url-1', 'url-2']);
        expect(result.enqueuedCount).toBe(2);
        expect(dataSource.transaction).toHaveBeenCalled();
    });
});
