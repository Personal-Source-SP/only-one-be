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
            save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
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

        service = new DiscoverySessionService(sessionRepo, dataProviderRepo, discoveryUrlRepo, mapper, runnerService);
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
        expect(sessionRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetUrl: 'https://amazon.com/deals',
                depth: 2,
                maxUrls: 50,
            }),
        );
        expect(runnerService.runDiscovery).toHaveBeenCalled();
    });
});
