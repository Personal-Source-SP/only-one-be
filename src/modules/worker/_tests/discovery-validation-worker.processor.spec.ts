import { AUDIT_LOG_EVENTS, AuditAction, AuditResource, AuditStatus } from '../../audit-log/enums/audit-log.enum';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { DiscoveryValidationWorkerProcessor } from '../processors/discovery-validation-worker.processor';

describe('DiscoveryValidationWorkerProcessor', () => {
    let processor: DiscoveryValidationWorkerProcessor;
    let dataSource: any;
    let discoveryUrlService: any;
    let discoverySessionService: any;
    let discoveryValidationLogService: any;
    let eventEmitter: any;

    beforeEach(() => {
        dataSource = {
            transaction: jest.fn(async (cb) => {
                const manager = {
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                    save: jest.fn().mockResolvedValue({}),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        update: jest.fn().mockReturnThis(),
                        set: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        execute: jest.fn().mockResolvedValue({ affected: 1 }),
                    }),
                    findOne: jest.fn().mockResolvedValue(null),
                };
                return await cb(manager);
            }),
        };

        discoveryUrlService = {
            findById: jest.fn().mockResolvedValue({
                id: 'url-1',
                url: 'https://example.com/p1',
                title: 'Product 1',
                domain: 'example.com',
            }),
        };

        discoverySessionService = {
            findById: jest.fn().mockResolvedValue({ id: 'session-1', validationStatus: 'in_progress' }),
        };

        discoveryValidationLogService = {
            createValidationLog: jest.fn().mockReturnValue({ id: 'log-1' }),
        };

        eventEmitter = {
            emit: jest.fn(),
        };

        processor = new DiscoveryValidationWorkerProcessor(
            dataSource,
            discoveryUrlService,
            discoverySessionService,
            discoveryValidationLogService,
            eventEmitter,
        );
    });

    it('should process validation job and update discovery URL evaluation', async () => {
        const job: any = {
            id: 'job-1',
            attemptsMade: 1,
            data: {
                urlId: 'url-1',
                sessionId: 'session-1',
                targetKeyword: 'product',
            },
        };

        await processor.process(job);

        expect(discoverySessionService.findById).toHaveBeenCalledWith('session-1');
        expect(discoveryUrlService.findById).toHaveBeenCalledWith('url-1');
        expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should emit failure audit log event on error', async () => {
        const job: any = {
            id: 'job-1',
            attemptsMade: 2,
            data: {
                urlId: 'url-1',
                sessionId: 'session-1',
                targetKeyword: 'product',
            },
        };

        const error = new Error('Connection timeout');
        await processor.onError(job, error);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
            AUDIT_LOG_EVENTS.RECORD,
            expect.objectContaining({
                action: AuditAction.RUN_JOB,
                status: AuditStatus.FAILED,
                resource: AuditResource.DISCOVERY_URL,
                resourceId: 'url-1',
                errorMessage: 'Connection timeout',
                deduplicationKey: `audit_fail_${QUEUE_NAME.DISCOVERY_VALIDATION_JOB}_job-1_2`,
            }),
        );
    });
});
