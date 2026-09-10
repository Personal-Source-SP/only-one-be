import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AppException } from '../../../../exceptions/app.exception';
import { LoggerService } from '../../../../shared/services/logger.service';
import { ConfigVersionEntity } from '../../entities/config-version.entity';
import { ConfigVersionService } from '../config-version.service';

describe('ConfigVersionService', () => {
    let service: ConfigVersionService;
    let mockRepo: any;
    let mockDataSource: any;
    let mockLogger: any;

    beforeEach(async () => {
        mockRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        mockDataSource = {
            transaction: jest.fn(),
        };

        mockLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigVersionService,
                { provide: getRepositoryToken(ConfigVersionEntity), useValue: mockRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: LoggerService, useValue: mockLogger },
                { provide: 'automapper:nestjs:default', useValue: { map: jest.fn((e) => e) } },
            ],
        }).compile();

        service = module.get<ConfigVersionService>(ConfigVersionService);
    });

    describe('create', () => {
        it('should map CreateConfigVersionRequestDto and save entity in transaction', async () => {
            const request = {
                featureId: 'feat-1',
                isActive: true,
                config: { sampleUrl: 'https://example.com' },
                changeType: 'MANUAL_EDIT' as any,
                changeDescription: 'initial',
            };

            const queryBuilderMock = {
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ versionId: 2 }),
            };
            mockRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilderMock);

            const mockTxRepo = {
                update: jest.fn().mockResolvedValue({ affected: 1 }),
                save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'ver-3', ...entity })),
            };
            mockDataSource.transaction.mockImplementation((cb: any) => cb({ getRepository: () => mockTxRepo }));

            const result = await service.create(request as any);

            expect(mockTxRepo.update).toHaveBeenCalledWith({ featureId: 'feat-1', isActive: true }, { isActive: false });
            expect(mockTxRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    featureId: 'feat-1',
                    versionId: 3,
                    config: { sampleUrl: 'https://example.com' },
                }),
            );
            expect(result).toBeDefined();
        });
    });

    describe('rollbackToVersionIdByFeature', () => {
        it('should throw AppException when version is not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(service.rollbackByFeatureId('feat-1', 99)).rejects.toThrow(AppException);
        });
    });

    describe('deleteConfigVersionByFeature', () => {
        it('should throw AppException when version is not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(service.deleteByFeatureId('feat-1', 99)).rejects.toThrow(AppException);
        });

        it('should throw AppException when attempting to delete active version', async () => {
            mockRepo.findOne.mockResolvedValue({ id: 'ver-1', isActive: true });

            await expect(service.deleteByFeatureId('feat-1', 1)).rejects.toThrow(AppException);
        });
    });
});
