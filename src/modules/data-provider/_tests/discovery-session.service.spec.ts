import { CreateDiscoverySessionRequestDto } from '../dtos/requests/create-discovery-session-request.dto';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoverySessionService } from '../services/discovery-session.service';

describe('DiscoverySessionService', () => {
    let service: DiscoverySessionService;
    let sessionRepo: any;
    let dataProviderRepo: any;
    let discoveryUrlRepo: any;
    let mapper: any;
    let runnerService: any;

    beforeEach(() => {
        sessionRepo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'session-1', ...dto })),
            save: jest.fn().mockImplementation((s) => Promise.resolve({ id: 'session-1', ...s })),
            findOne: jest.fn(),
        };

        dataProviderRepo = {
            findOne: jest.fn().mockResolvedValue({
                id: 'dp-1',
                name: 'Amazon US',
                identifier: 'amazon_us',
            }),
        };

        discoveryUrlRepo = {
            count: jest.fn().mockResolvedValue(5),
        };

        mapper = {
            map: jest.fn().mockImplementation((entity) => ({ ...entity })),
            mapArray: jest.fn().mockImplementation((arr) => arr),
        };

        runnerService = {
            runDiscovery: jest.fn().mockResolvedValue(undefined),
        };

        const discoveryUrlService: any = {
            batchIngest: jest.fn().mockResolvedValue({ totalProcessed: 1, itemsCreated: 1, itemsReused: 0, dataProviderItemsCreated: 1 }),
        };

        service = new DiscoverySessionService(sessionRepo, dataProviderRepo, discoveryUrlRepo, mapper, runnerService, discoveryUrlService);
    });

    it('should create a new discovery session with generated sessionCode and trigger runner', async () => {
        const result = await service.createSession({
            dataProviderId: 'dp-1',
            targetUrl: 'https://amazon.com/deals',
            depth: 2,
            maxUrls: 50,
        });

        expect(result).toBeDefined();
        expect(result.sessionCode).toMatch(/^DISC-AMAZ-\d{3}$/);
        expect(mapper.map).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetUrl: 'https://amazon.com/deals',
            }),
            CreateDiscoverySessionRequestDto,
            DiscoverySessionEntity,
        );
        expect(sessionRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetUrl: 'https://amazon.com/deals',
                depth: 2,
                maxUrls: 50,
                sessionCode: expect.stringMatching(/^DISC-AMAZ-\d{3}$/),
            }),
        );
        expect(runnerService.runDiscovery).toHaveBeenCalled();
    });

    it('should map request to DiscoverySessionEntity and save session', async () => {
        const result = await service.createSession({
            dataProviderId: 'dp-1',
            targetUrl: 'https://amazon.com/deals',
        });

        expect(result).toBeDefined();
        expect(mapper.map).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetUrl: 'https://amazon.com/deals',
            }),
            CreateDiscoverySessionRequestDto,
            DiscoverySessionEntity,
        );
        expect(sessionRepo.save).toHaveBeenCalled();
    });

    it('should return session summary with metrics', async () => {
        sessionRepo.findOne.mockResolvedValue({
            id: 'session-1',
            totalDiscovered: 10,
            totalQueued: 3,
        });

        const summary = await service.getSessionSummary('session-1');

        expect(summary).toBeDefined();
        expect(summary.totalDiscovered).toBe(10);
        expect(summary.totalQueued).toBe(3);
        expect(summary.exactMatches).toBe(5);
        expect(summary.partialMatches).toBe(5);
        expect(summary.noMatches).toBe(5);
    });

    it('should delegate batchIngestUrls to discoveryUrlService.batchIngest', async () => {
        const result = await service.batchIngestUrls('session-1', ['url-1']);
        expect(result).toBeDefined();
        expect(result.itemsCreated).toBe(1);
    });
});
