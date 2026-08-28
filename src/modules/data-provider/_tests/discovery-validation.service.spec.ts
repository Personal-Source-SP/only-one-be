import { FinalValidationStatus, ValidationUserAction } from '../enums';
import { DiscoveryValidationService } from '../services/discovery-validation.service';

describe('DiscoveryValidationService', () => {
    let service: DiscoveryValidationService;
    let urlRepo: any;
    let batchRepo: any;
    let logRepo: any;
    let sessionRepo: any;
    let dataSource: any;

    beforeEach(() => {
        urlRepo = {
            find: jest.fn().mockResolvedValue([
                {
                    id: 'url-1',
                    sessionId: 'session-1',
                    url: 'https://amazon.com/dp/B08N5WRWNW',
                    domain: 'amazon.com',
                    title: 'Sony WH-1000XM4 Headphones - $348.00',
                },
                {
                    id: 'url-2',
                    sessionId: 'session-1',
                    url: 'https://amazon.com/category/electronics',
                    domain: 'amazon.com',
                    title: 'Electronics Category',
                },
            ]),
            findOne: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        batchRepo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'batch-1', ...dto })),
            save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
            findOne: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        logRepo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'log-1', ...dto })),
            save: jest.fn().mockImplementation((l) => Promise.resolve(l)),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        sessionRepo = {
            findOne: jest.fn().mockResolvedValue({ id: 'session-1', targetUrl: 'https://amazon.com' }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        dataSource = {
            transaction: jest.fn().mockImplementation(async (cb) => {
                return await cb({
                    save: jest.fn().mockResolvedValue(true),
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                });
            }),
        };

        service = new DiscoveryValidationService(urlRepo, batchRepo, logRepo, sessionRepo, dataSource);
    });

    it('should run batch validation and save results and audit logs', async () => {
        const batch = await service.startBatchValidation('session-1', 'Sony WH-1000XM4');
        expect(batch).toBeDefined();
        expect(batch.sessionId).toBe('session-1');
        expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should submit user action and set final status to APPROVED when confirmed', async () => {
        const result = await service.submitUserAction('url-1', ValidationUserAction.CONFIRM, 'Valid product');
        expect(result).toBe(true);
        expect(urlRepo.update).toHaveBeenCalledWith(
            'url-1',
            expect.objectContaining({
                userAction: ValidationUserAction.CONFIRM,
                finalValidationStatus: FinalValidationStatus.APPROVED,
            }),
        );
    });

    it('should submit user action and set final status to REJECTED when rejected', async () => {
        const result = await service.submitUserAction('url-2', ValidationUserAction.REJECT, 'Category page');
        expect(result).toBe(true);
        expect(urlRepo.update).toHaveBeenCalledWith(
            'url-2',
            expect.objectContaining({
                userAction: ValidationUserAction.REJECT,
                finalValidationStatus: FinalValidationStatus.REJECTED,
            }),
        );
    });
});
