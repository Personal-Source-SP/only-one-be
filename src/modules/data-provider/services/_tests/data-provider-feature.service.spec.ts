import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppException } from '../../../../exceptions/app.exception';
import { LoggerService } from '../../../../shared/services/logger.service';
import { DataProviderError } from '../../constants/data-provider-error';
import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
import { DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../../enums';
import { FeatureRunnerRegistry } from '../../runners/feature-runner.registry';
import { ConfigVersionService } from '../config-version.service';
import { DataProviderFeatureService } from '../data-provider-feature.service';

describe('DataProviderFeatureService', () => {
    let service: DataProviderFeatureService;
    let mockRepo: any;
    let mockRunnerRegistry: any;
    let mockRunner: any;
    let mockConfigVersionService: any;
    let mockLogger: any;
    let mockEventEmitter: any;

    beforeEach(async () => {
        mockRepo = {
            create: jest.fn((entity) => entity),
            save: jest.fn((entity) => Promise.resolve({ id: 'feature-1', ...entity })),
            findOne: jest.fn(),
            exists: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        mockRunner = {
            testStateless: jest.fn().mockResolvedValue({ data: [] }),
            testContextual: jest.fn().mockResolvedValue({ status: 'success' }),
        };

        mockRunnerRegistry = {
            getRunner: jest.fn().mockReturnValue(mockRunner),
        };

        mockConfigVersionService = {
            create: jest.fn().mockResolvedValue({ id: 'ver-1' }),
        };

        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
        };

        mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataProviderFeatureService,
                { provide: getRepositoryToken(DataProviderFeatureEntity), useValue: mockRepo },
                { provide: FeatureRunnerRegistry, useValue: mockRunnerRegistry },
                { provide: ConfigVersionService, useValue: mockConfigVersionService },
                { provide: LoggerService, useValue: mockLogger },
                { provide: 'EventEmitter2', useValue: mockEventEmitter },
                { provide: 'automapper:nestjs:default', useValue: { map: jest.fn((entity) => entity) } },
            ],
        }).compile();

        service = module.get<DataProviderFeatureService>(DataProviderFeatureService);
        jest.clearAllMocks();
    });

    describe('createFeature', () => {
        it('should execute testStateless when input is provided and create feature with READY status', async () => {
            mockRepo.exists.mockResolvedValue(false);

            const result = await service.createFeature({
                dataProviderId: 'provider-1',
                type: DataProviderFeatureType.SCRAPING,
                service: ScraperServiceEnum.GENERIC,
                config: { sampleUrl: 'https://example.com' },
                input: { url: 'https://example.com' },
            });

            expect(mockRunner.testStateless).toHaveBeenCalledWith(
                ScraperServiceEnum.GENERIC,
                { sampleUrl: 'https://example.com' },
                { url: 'https://example.com' },
            );
            expect(mockRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataProviderId: 'provider-1',
                    status: DataProviderFeatureStatus.READY,
                    service: ScraperServiceEnum.GENERIC,
                }),
            );
            expect(result).toBeDefined();
        });

        it('should throw AppException and not create entity if testStateless fails', async () => {
            mockRepo.exists.mockResolvedValue(false);
            mockRunner.testStateless.mockRejectedValue(new AppException(DataProviderError.FeatureTestFailed('Scraping error')));

            await expect(
                service.createFeature({
                    dataProviderId: 'provider-1',
                    type: DataProviderFeatureType.SCRAPING,
                    service: ScraperServiceEnum.GENERIC,
                    config: {},
                    input: { url: 'https://example.com' },
                }),
            ).rejects.toThrow(AppException);

            expect(mockRepo.create).not.toHaveBeenCalled();
        });
    });

    describe('updateFeatureConfig', () => {
        it('should execute testStateless if input is provided before saving snapshot and updating', async () => {
            const existingFeature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                service: ScraperServiceEnum.GENERIC,
                status: DataProviderFeatureStatus.READY,
                config: {},
            };
            mockRepo.findOne.mockResolvedValue(existingFeature);

            await service.updateFeature('feat-1', {
                config: { newKey: 'val' },
                changeDescription: 'Updated scraping selectors',
                input: { url: 'https://example.com' },
            });

            expect(mockRunner.testStateless).toHaveBeenCalledWith(
                ScraperServiceEnum.GENERIC,
                { newKey: 'val' },
                { url: 'https://example.com' },
            );
            expect(mockConfigVersionService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    featureId: 'feat-1',
                    changeDescription: 'Updated scraping selectors',
                }),
                undefined,
            );
        });

        it('should abort update if testStateless throws AppException', async () => {
            const existingFeature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                service: ScraperServiceEnum.GENERIC,
                status: DataProviderFeatureStatus.READY,
            };
            mockRepo.findOne.mockResolvedValue(existingFeature);
            mockRunner.testStateless.mockRejectedValue(new AppException(DataProviderError.FeatureTestFailed('Failed')));

            await expect(
                service.updateFeature('feat-1', {
                    config: {},
                    changeDescription: 'Invalid config',
                    input: { url: 'invalid' },
                }),
            ).rejects.toThrow(AppException);

            expect(mockConfigVersionService.create).not.toHaveBeenCalled();
        });
    });

    describe('switchStatus', () => {
        it('should call testContextual and update status to READY only on success', async () => {
            const feature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                status: DataProviderFeatureStatus.TESTING,
            };
            mockRepo.findOne.mockResolvedValue(feature);

            const result = await service.switchStatus('feat-1', DataProviderFeatureStatus.READY);

            expect(mockRunner.testContextual).toHaveBeenCalled();
            expect(mockRepo.update).toHaveBeenCalledWith(
                'feat-1',
                expect.objectContaining({
                    status: DataProviderFeatureStatus.READY,
                    consecutiveFailures: 0,
                }),
            );
            expect(result).toBe(true);
        });

        it('should throw AppException and not update status if testContextual fails', async () => {
            const feature = {
                id: 'feat-1',
                type: DataProviderFeatureType.SCRAPING,
                status: DataProviderFeatureStatus.TESTING,
            };
            mockRepo.findOne.mockResolvedValue(feature);
            mockRunner.testContextual.mockRejectedValue(
                new AppException(DataProviderError.FeatureValidationFailed('Contextual validation failed')),
            );

            await expect(service.switchStatus('feat-1', DataProviderFeatureStatus.READY)).rejects.toThrow(AppException);
            expect(mockRepo.update).not.toHaveBeenCalled();
        });
    });
});
