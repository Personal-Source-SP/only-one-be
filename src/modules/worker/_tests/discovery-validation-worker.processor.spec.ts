import { DiscoveryUrlEntity } from '../../data-provider/entities/discovery-url.entity';
import { DiscoveryValidationWorkerProcessor } from '../processors/discovery-validation-worker.processor';

describe('DiscoveryValidationWorkerProcessor', () => {
    let processor: DiscoveryValidationWorkerProcessor;
    let discoveryValidationService: any;
    let discoveryUrlRepository: any;

    beforeEach(() => {
        discoveryValidationService = {
            validateUrlForBatch: jest.fn().mockResolvedValue(undefined),
        };

        discoveryUrlRepository = {
            findOne: jest.fn().mockResolvedValue({
                id: 'url-1',
                sessionId: 'session-1',
                url: 'https://example.com/item1',
            } as DiscoveryUrlEntity),
        };

        processor = new DiscoveryValidationWorkerProcessor(discoveryValidationService, discoveryUrlRepository);
    });

    it('should process validation job and invoke validateUrlForBatch successfully', async () => {
        const job: any = {
            id: 'job-1',
            data: {
                urlId: 'url-1',
                sessionId: 'session-1',
                batchId: 'batch-1',
                targetKeyword: 'item1',
            },
        };

        await processor.process(job);

        expect(discoveryUrlRepository.findOne).toHaveBeenCalledWith({ where: { id: 'url-1' } });
        expect(discoveryValidationService.validateUrlForBatch).toHaveBeenCalledWith(job.data);
    });

    it('should skip job if discovery URL entity does not exist', async () => {
        discoveryUrlRepository.findOne.mockResolvedValue(null);

        const job: any = {
            id: 'job-2',
            data: {
                urlId: 'url-non-existent',
                sessionId: 'session-1',
                batchId: 'batch-1',
            },
        };

        await processor.process(job);

        expect(discoveryValidationService.validateUrlForBatch).not.toHaveBeenCalled();
    });

    it('should rethrow error when validation service fails', async () => {
        discoveryValidationService.validateUrlForBatch.mockRejectedValue(new Error('Validation DB error'));

        const job: any = {
            id: 'job-3',
            data: {
                urlId: 'url-1',
                sessionId: 'session-1',
                batchId: 'batch-1',
            },
        };

        await expect(processor.process(job)).rejects.toThrow('Validation DB error');
    });
});
