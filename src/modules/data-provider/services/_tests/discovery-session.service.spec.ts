import { CreateDiscoverySessionRequestDto } from '../../dtos/requests/create-discovery-session-request.dto';
import { DiscoverySessionEntity } from '../../entities/discovery-session.entity';
import { DiscoverySessionService } from '../discovery-session.service';

describe('DiscoverySessionService', () => {
    let service: DiscoverySessionService;
    let sessionRepo: any;
    let dataProviderService: any;
    let discoveryUrlService: any;
    let mapper: any;
    let queueService: any;
    let searchFeatureRunner: any;
    let validationService: any;
    let searchServiceMap: any;

    beforeEach(() => {
        sessionRepo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'session-1', ...dto })),
            save: jest.fn().mockImplementation((s) => Promise.resolve({ id: 'session-1', ...s })),
            findOne: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
        };

        dataProviderService = {
            findById: jest.fn().mockResolvedValue({
                id: 'dp-1',
                name: 'Amazon US',
                identifier: 'amazon_us',
                features: [
                    {
                        type: 'search',
                        service: 'generic',
                        status: 'READY',
                        config: { searchUrlPattern: 'https://amazon.com/s?k={query}', maxResults: 50 },
                    },
                ],
            }),
        };

        discoveryUrlService = {
            count: jest.fn().mockResolvedValue(5),
            findListByFilter: jest.fn().mockResolvedValue([]),
            createMany: jest.fn().mockResolvedValue([]),
        };

        mapper = {
            map: jest.fn().mockImplementation((entity) => ({ ...entity })),
            mapArray: jest.fn().mockImplementation((arr) => arr),
        };

        queueService = {
            addJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
        };

        searchFeatureRunner = {
            buildSearchUrl: jest.fn().mockReturnValue('https://amazon.com/s?k=sony'),
        };

        validationService = {
            startBatchValidation: jest.fn().mockResolvedValue(undefined),
        };

        searchServiceMap = {
            generic: {
                getExtractSearchData: jest.fn().mockResolvedValue({
                    data: [{ url: 'https://amazon.com/dp/B08HV6LK6X', title: 'Sony WH-1000XM4' }],
                }),
            },
        };

        service = new DiscoverySessionService(
            queueService,
            searchFeatureRunner,
            dataProviderService,
            discoveryUrlService,
            validationService,
            mapper,
            searchServiceMap,
            sessionRepo,
        );
    });

    it('should create a new discovery session with generated sessionCode and enqueue jobs', async () => {
        const result = await service.create({
            dataProviderId: 'dp-1',
            targetKeywords: ['sony'],
            depth: 2,
            maxUrls: 50,
        });

        expect(result).toBeDefined();
        expect(result.sessionCode).toMatch(/^DISC-AMAZ-\d{3}$/);
        expect(mapper.map).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetKeywords: ['sony'],
            }),
            CreateDiscoverySessionRequestDto,
            DiscoverySessionEntity,
        );
        expect(sessionRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                dataProviderId: 'dp-1',
                targetKeywords: ['sony'],
                depth: 2,
                maxUrls: 50,
                sessionCode: expect.stringMatching(/^DISC-AMAZ-\d{3}$/),
            }),
        );
        expect(queueService.addJob).toHaveBeenCalledWith('discovery-search-job', expect.objectContaining({ keyword: 'sony' }));
    });

    it('should process discovery search for a keyword and save discovered URLs', async () => {
        sessionRepo.findOne.mockResolvedValue({
            id: 'session-1',
            dataProviderId: 'dp-1',
            targetUrl: 'https://amazon.com/s?k=sony',
            dataProvider: {
                features: [
                    {
                        type: 'search',
                        service: 'generic',
                        status: 'READY',
                        config: { searchUrlPattern: 'https://amazon.com/s?k={query}', maxResults: 50 },
                    },
                ],
            },
        });

        await service.processDiscoverySearch('session-1', 'sony');

        expect(searchServiceMap.generic.getExtractSearchData).toHaveBeenCalled();
        expect(discoveryUrlService.createMany).toHaveBeenCalled();
        expect(sessionRepo.update).toHaveBeenCalledWith(
            'session-1',
            expect.objectContaining({ status: 'completed' }),
        );
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
});
