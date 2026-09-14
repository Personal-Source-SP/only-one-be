import { Mapper } from '@automapper/core';
import { getMapperToken } from '@automapper/nestjs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SettingDto } from '../../dtos/setting.dto';
import { SettingEntity } from '../../entities/setting.entity';
import { SettingType } from '../../enums';
import { SettingService } from '../setting.service';

describe('SettingService', () => {
    let service: SettingService;
    let mockRepository: any;
    let mockMapper: any;

    beforeEach(async () => {
        mockRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn((entity) => Promise.resolve({ id: 'setting-1', ...entity })),
            exists: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        mockMapper = {
            mapArray: jest.fn().mockReturnValue([]),
            map: jest.fn((source, sourceIdentifier, destinationIdentifier) => {
                if (!source) return null;
                return { ...source };
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettingService,
                {
                    provide: getRepositoryToken(SettingEntity),
                    useValue: mockRepository,
                },
                {
                    provide: getMapperToken(),
                    useValue: mockMapper,
                },
            ],
        }).compile();

        service = module.get<SettingService>(SettingService);
    });

    describe('saveUserSetting', () => {
        it('should create new user setting when setting does not exist', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.saveUserSetting('user-123', 'appearance', { theme: 'dark' });

            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: {
                    key: 'appearance',
                    userId: 'user-123',
                    type: SettingType.USER,
                },
            });
            expect(mockRepository.create).toHaveBeenCalledWith({
                key: 'appearance',
                value: { theme: 'dark' },
                userId: 'user-123',
                isActive: true,
                type: SettingType.USER,
            });
            expect(mockRepository.save).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.value).toEqual({ theme: 'dark' });
        });

        it('should update existing user setting without throwing KeyAlreadyExists exception', async () => {
            const existingEntity: Partial<SettingEntity> = {
                id: 'setting-existing-id',
                key: 'appearance',
                value: { theme: 'light' },
                userId: 'user-123',
                isActive: true,
                type: SettingType.USER,
            };
            mockRepository.findOne.mockResolvedValue(existingEntity);

            const result = await service.saveUserSetting('user-123', 'appearance', { theme: 'dark' });

            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: {
                    key: 'appearance',
                    userId: 'user-123',
                    type: SettingType.USER,
                },
            });
            expect(mockRepository.create).not.toHaveBeenCalled();
            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'setting-existing-id',
                    value: { theme: 'dark' },
                }),
            );
            expect(result.value).toEqual({ theme: 'dark' });
        });
    });

    describe('getUserSetting', () => {
        it('should return setting dto when found', async () => {
            const entity = {
                id: 'setting-1',
                key: 'appearance',
                value: { theme: 'dark' },
                userId: 'user-123',
                type: SettingType.USER,
            };
            mockRepository.findOne.mockResolvedValue(entity);

            const result = await service.getUserSetting('user-123', 'appearance');

            expect(mockRepository.findOne).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should return null when not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.getUserSetting('user-123', 'appearance');

            expect(result).toBeNull();
        });
    });
});
