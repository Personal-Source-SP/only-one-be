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
                autoValidate: true,
            }),
        );
        expect(runnerService.runDiscovery).toHaveBeenCalled();
    });

    it('should create session with null maxUrls (unbounded) and default autoValidate true when omitted', async () => {
        const result = await service.createSession({
            dataProviderId: 'dp-1',
            targetUrl: 'https://amazon.com/deals',
        });

        expect(result).toBeDefined();
        expect(sessionRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetUrl: 'https://amazon.com/deals',
                depth: 1,
                maxUrls: null,
                autoValidate: true,
            }),
        );
    });

    it('should respect explicit autoValidate false setting', async () => {
        const result = await service.createSession({
            dataProviderId: 'dp-1',
            targetUrl: 'https://amazon.com/deals',
            autoValidate: false,
            maxUrls: 20,
        });

        expect(result).toBeDefined();
        expect(sessionRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetUrl: 'https://amazon.com/deals',
                maxUrls: 20,
                autoValidate: false,
            }),
        );
    });
});
