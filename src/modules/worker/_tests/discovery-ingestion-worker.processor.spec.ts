import { DiscoveryUrlStatus } from '../../data-provider/enums';
import { DiscoveryIngestionWorkerProcessor } from '../processors/discovery-ingestion-worker.processor';

describe('DiscoveryIngestionWorkerProcessor', () => {
    let processor: DiscoveryIngestionWorkerProcessor;
    let dataSource: any;
    let discoveryUrlService: any;
    let discoveryUrlRepository: any;

    beforeEach(() => {
        dataSource = {};

        discoveryUrlService = {
            ingestDiscoveredUrl: jest.fn().mockResolvedValue({
                isNewItem: true,
                itemId: 'item-1',
                dataProviderItemId: 'dpi-1',
            }),
        };

        discoveryUrlRepository = {
            findOne: jest.fn().mockResolvedValue({
                id: 'url-1',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
                url: 'https://example.com/product1',
                status: DiscoveryUrlStatus.QUEUED,
            }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        processor = new DiscoveryIngestionWorkerProcessor(dataSource, discoveryUrlService, discoveryUrlRepository);
    });

    it('should process ingestion job and invoke ingestDiscoveredUrl successfully', async () => {
        const job: any = {
            id: 'job-1',
            data: {
                urlId: 'url-1',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
            },
        };

        await processor.process(job);

        expect(discoveryUrlRepository.findOne).toHaveBeenCalledWith({ where: { id: 'url-1' } });
        expect(discoveryUrlService.ingestDiscoveredUrl).toHaveBeenCalledWith('url-1');
    });

    it('should skip job if discovery URL entity does not exist', async () => {
        discoveryUrlRepository.findOne.mockResolvedValue(null);

        const job: any = {
            id: 'job-2',
            data: {
                urlId: 'url-non-existent',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
            },
        };

        await processor.process(job);

        expect(discoveryUrlService.ingestDiscoveredUrl).not.toHaveBeenCalled();
    });

    it('should mark status as FAILED and rethrow error when ingestion fails', async () => {
        discoveryUrlService.ingestDiscoveredUrl.mockRejectedValue(new Error('Ingestion DB error'));

        const job: any = {
            id: 'job-3',
            data: {
                urlId: 'url-1',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
            },
        };

        await expect(processor.process(job)).rejects.toThrow('Ingestion DB error');
        expect(discoveryUrlRepository.update).toHaveBeenCalledWith('url-1', {
            status: DiscoveryUrlStatus.FAILED,
        });
    });
});
