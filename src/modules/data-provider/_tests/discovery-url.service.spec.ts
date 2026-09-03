import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { DiscoveryUrlStatus } from '../enums';
import { DiscoveryUrlService } from '../services/discovery-url.service';

describe('DiscoveryUrlService', () => {
    let service: DiscoveryUrlService;
    let urlRepo: any;
    let sessionRepo: any;
    let logRepo: any;
    let mapper: any;
    let itemService: any;
    let dataProviderItemService: any;
    let queueService: any;

    beforeEach(() => {
        urlRepo = {
            find: jest.fn().mockResolvedValue([
                {
                    id: 'url-1',
                    sessionId: 'session-1',
                    dataProviderId: 'dp-1',
                    url: 'https://example.com/p1?sku=SKU-1',
                    title: 'Product 1',
                },
            ]),
            findOne: jest.fn().mockResolvedValue({
                id: 'url-1',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
                url: 'https://example.com/p1?sku=SKU-1',
                title: 'Product 1',
            }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
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

        itemService = {
            findOneByFilter: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'item-1', name: 'Product 1', code: 'SKU-1' }),
        };

        dataProviderItemService = {
            findOneByFilterAndOptions: jest.fn().mockResolvedValue(null),
            create: jest
                .fn()
                .mockResolvedValue({ id: 'dpi-1', itemId: 'item-1', dataProviderId: 'dp-1', itemUrl: 'https://example.com/p1?sku=SKU-1' }),
        };

        queueService = {
            addBulkJob: jest.fn().mockResolvedValue([]),
            addJob: jest.fn().mockResolvedValue({}),
        };

        service = new DiscoveryUrlService(itemService, dataProviderItemService, queueService, mapper, urlRepo, sessionRepo, logRepo);
    });

    it('should ingest discovered URL by creating item and dataProviderItem', async () => {
        const result = await service.ingestDiscoveredUrl('url-1');

        expect(result.itemId).toBe('item-1');
        expect(result.dataProviderItemId).toBe('dpi-1');
        expect(result.isNewItem).toBe(true);
        expect(urlRepo.update).toHaveBeenCalledWith('url-1', { status: DiscoveryUrlStatus.INGESTED });
    });

    it('should batch ingest URLs in a session by dispatching jobs to queue', async () => {
        const result = await service.batchIngest('session-1', ['url-1']);

        expect(result.totalProcessed).toBe(1);
        expect(result.totalQueued).toBe(1);
        expect(result.sessionId).toBe('session-1');
        expect(urlRepo.update).toHaveBeenCalled();
        expect(queueService.addBulkJob).toHaveBeenCalledWith(
            QUEUE_NAME.DISCOVERY_INGESTION_JOB,
            expect.arrayContaining([
                expect.objectContaining({
                    data: {
                        urlId: 'url-1',
                        sessionId: 'session-1',
                        dataProviderId: 'dp-1',
                    },
                }),
            ]),
        );
    });
});
