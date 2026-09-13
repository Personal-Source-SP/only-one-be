import { Mapper } from '@automapper/core';
import { getMapperToken } from '@automapper/nestjs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataProviderEntity } from '../../entities/data-provider.entity';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../../enums';
import { DataProviderItemService } from '../data-provider-item.service';
import { DataProviderService } from '../data-provider.service';

describe('DataProviderService', () => {
    let service: DataProviderService;
    let mockRepository: any;
    let mockMapper: any;
    let mockQueryBuilder: any;

    beforeEach(async () => {
        mockQueryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };

        mockRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn((entity) => Promise.resolve({ id: 'provider-1', ...entity })),
        };

        mockMapper = {
            mapArray: jest.fn().mockReturnValue([]),
            map: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataProviderService,
                {
                    provide: getRepositoryToken(DataProviderEntity),
                    useValue: mockRepository,
                },
                {
                    provide: getMapperToken(),
                    useValue: mockMapper,
                },
                {
                    provide: DataProviderItemService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<DataProviderService>(DataProviderService);
    });

    it('should query data providers with features filtered by type and status', async () => {
        const result = await service.findAllWithFeatures({
            featureType: DataProviderFeatureType.SEARCH,
            featureStatus: DataProviderFeatureStatus.READY,
        });

        expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('dataProvider');
        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('dataProvider.features', 'feature');
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('feature.type = :featureType', {
            featureType: DataProviderFeatureType.SEARCH,
        });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('feature.status = :featureStatus', {
            featureStatus: DataProviderFeatureStatus.READY,
        });
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('dataProvider.createdAt', 'DESC');
        expect(mockQueryBuilder.getMany).toHaveBeenCalled();
        expect(result).toEqual([]);
    });
});
