import { AUDIT_LOG_EVENTS, AuditAction, AuditResource, AuditStatus } from '../../audit-log/enums/audit-log.enum';
import { QUEUE_NAME } from '../../queue/enums/queue-name.enum';
import { DiscoveryValidationWorkerProcessor } from '../processors/discovery-validation-worker.processor';

describe('DiscoveryValidationWorkerProcessor', () => {
    let processor: DiscoveryValidationWorkerProcessor;
    let discoveryUrlService: any;
    let eventEmitter: any;

    beforeEach(() => {
        discoveryUrlService = {
            processDiscoveryValidation: jest.fn().mockResolvedValue(undefined),
        };

        eventEmitter = {
            emit: jest.fn(),
        };

        processor = new DiscoveryValidationWorkerProcessor(
            eventEmitter,
            discoveryUrlService,
        );
    });

    it('should process validation job by delegating to discoveryUrlService', async () => {
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

        expect(discoveryUrlService.processDiscoveryValidation).toHaveBeenCalledWith('session-1', 'url-1', 'product');
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
