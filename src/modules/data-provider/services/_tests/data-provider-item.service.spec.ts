import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderItemEntity } from '../../entities/data-provider-item.entity';
import { DataProviderService } from '../data-provider.service';
import { DataProviderItemService } from '../data-provider-item.service';
import { ItemService } from '../item.service';

describe('DataProviderItemService', () => {
    let service: DataProviderItemService;
    let mockRepo: any;
    let mockItemService: any;
    let mockDataProviderService: any;
    let mockEventEmitter: any;

    beforeEach(async () => {
        mockRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn((e) => e),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        mockItemService = {
            exists: jest.fn(),
        };

        mockDataProviderService = {
            findOneByFilter: jest.fn(),
        };

        mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataProviderItemService,
                { provide: getRepositoryToken(DataProviderItemEntity), useValue: mockRepo },
                { provide: ItemService, useValue: mockItemService },
                { provide: DataProviderService, useValue: mockDataProviderService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: 'automapper:nestjs:default', useValue: { map: jest.fn((e) => e) } },
            ],
        }).compile();

        service = module.get<DataProviderItemService>(DataProviderItemService);
    });

    describe('create', () => {
        it('should throw AppException when item does not exist', async () => {
            mockItemService.exists.mockResolvedValue(false);

            await expect(
                service.create({
                    itemId: 'item-1',
                    dataProviderId: 'dp-1',
                    itemUrl: 'https://example.com/item/1',
                } as any),
            ).rejects.toThrow(AppException);
        });

        it('should throw AppException when itemUrl does not start with baseUrl', async () => {
            mockItemService.exists.mockResolvedValue(true);
            mockDataProviderService.findOneByFilter.mockResolvedValue({ id: 'dp-1', baseUrl: 'https://example.com' });

            await expect(
                service.create({
                    itemId: 'item-1',
                    dataProviderId: 'dp-1',
                    itemUrl: 'https://invalid-domain.com/item/1',
                } as any),
            ).rejects.toThrow(AppException);
        });
    });

    describe('switchActiveStatus', () => {
        it('should throw AppException when item is not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(service.switchActiveStatus('id-1', true)).rejects.toThrow(AppException);
        });
    });
});
