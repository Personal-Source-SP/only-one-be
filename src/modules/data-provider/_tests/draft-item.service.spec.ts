import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { DraftItemDto } from '../dtos/draft-item.dto';
import { SearchItemsResponseDto } from '../dtos/responses/search-items-response.dto';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DraftItemEntity } from '../entities/draft-item.entity';
import { ItemEntity } from '../entities/item.entity';
import { DataProviderFeatureStatus, DataProviderFeatureType, DraftItemStatus, MapDraftItemAction, ProductMappingStatus } from '../enums';
import { DataProviderFeatureService } from '../services/data-provider-feature.service';
import { DataProviderSearchService } from '../services/data-provider-search.service';
import { DraftItemService } from '../services/draft-item.service';

describe('DraftItemService', () => {
    let service: DraftItemService;
    let draftItemRepository: jest.Mocked<Repository<DraftItemEntity>>;
    let itemRepository: jest.Mocked<Repository<ItemEntity>>;
    let dataProviderItemRepository: jest.Mocked<Repository<DataProviderItemEntity>>;
    let dataProviderRepository: jest.Mocked<Repository<DataProviderEntity>>;
    let dataProviderSearchService: jest.Mocked<DataProviderSearchService>;
    let dataProviderFeatureService: jest.Mocked<DataProviderFeatureService>;
    let dataSource: jest.Mocked<DataSource>;
    let mapper: any;

    beforeEach(() => {
        draftItemRepository = {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((dto) => ({ id: 'draft-id-1', ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            createQueryBuilder: jest.fn(),
        } as any;

        itemRepository = {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((dto) => ({ id: 'item-id-1', ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        } as any;

        dataProviderItemRepository = {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((dto) => ({ id: 'dp-item-id-1', ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        } as any;

        dataProviderRepository = {
            createQueryBuilder: jest.fn(),
        } as any;

        dataProviderSearchService = {
            searchItems: jest.fn(),
        } as any;

        dataProviderFeatureService = {
            recordFeatureSuccess: jest.fn().mockResolvedValue(undefined),
            recordFeatureFailure: jest.fn().mockResolvedValue(undefined),
        } as any;

        dataSource = {
            createQueryRunner: jest.fn(),
        } as any;

        mapper = {
            map: jest.fn().mockImplementation((entity, _, dtoClass) => {
                const dto = new dtoClass();
                Object.assign(dto, entity);
                return dto;
            }),
        };

        service = new DraftItemService(
            draftItemRepository,
            itemRepository,
            dataProviderItemRepository,
            dataProviderRepository,
            dataProviderSearchService,
            dataProviderFeatureService,
            dataSource,
            mapper,
        );
    });

    describe('processSearchData', () => {
        it('TC-01: Batch Search Execution Happy Path', () => {
            const provider: Partial<DataProviderEntity> = {
                id: 'provider-1',
                name: 'Shopee',
                features: [
                    {
                        id: 'feature-1',
                        dataProviderId: 'provider-1',
                        type: DataProviderFeatureType.SEARCH,
                        status: DataProviderFeatureStatus.READY,
                    } as DataProviderFeatureEntity,
                ],
            };

            const mockQueryBuilder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([provider]),
            };
            dataProviderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

            dataProviderSearchService.searchItems.mockResolvedValue(
                new SearchItemsResponseDto({
                    dataProviderId: 'provider-1',
                    searchQuery: 'laptop',
                    status: 'success',
                    discoveredItems: [
                        {
                            url: 'https://shopee.vn/product-1',
                            title: 'Laptop Dell XPS 13',
                            confidence: 0.9,
                            price: '25000000',
                            currency: 'VND',
                        },
                    ],
                }),
            );

            draftItemRepository.findOne.mockResolvedValue(null);
            itemRepository.findOne.mockResolvedValue(null);

            return service
                .processSearchData({
                    dataProviderIds: ['provider-1'],
                    searchQueries: ['laptop'],
                })
                .then((result) => {
                    expect(result.process).toBe(1);
                    expect(result.success).toBe(1);
                    expect(result.error).toBe(0);
                    expect(result.totalDraftsCreated).toBe(1);
                    expect(dataProviderFeatureService.recordFeatureSuccess).toHaveBeenCalledWith('feature-1');
                    expect(draftItemRepository.save).toHaveBeenCalled();
                });
        });

        it('TC-02: Status Classification for Exact Code Match', async () => {
            const provider: Partial<DataProviderEntity> = {
                id: 'provider-1',
                name: 'Shopee',
                features: [
                    {
                        id: 'feature-1',
                        dataProviderId: 'provider-1',
                        type: DataProviderFeatureType.SEARCH,
                        status: DataProviderFeatureStatus.READY,
                    } as DataProviderFeatureEntity,
                ],
            };

            const mockQueryBuilder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([provider]),
            };
            dataProviderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

            dataProviderSearchService.searchItems.mockResolvedValue(
                new SearchItemsResponseDto({
                    dataProviderId: 'provider-1',
                    searchQuery: 'code123',
                    status: 'success',
                    discoveredItems: [
                        {
                            url: 'https://shopee.vn/product-2',
                            title: 'Mouse Logitech',
                            confidence: 0.95,
                        },
                    ],
                }),
            );

            draftItemRepository.findOne.mockResolvedValue(null);
            itemRepository.findOne.mockResolvedValue({
                id: 'existing-item-123',
                name: 'Mouse Logitech',
                code: 'code123',
            } as ItemEntity);

            const result = await service.processSearchData({
                dataProviderIds: ['provider-1'],
                searchQueries: ['code123'],
            });

            expect(result.success).toBe(1);
            expect(draftItemRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataProviderFeatureId: 'feature-1',
                    status: DraftItemStatus.SIMILAR,
                    suggestedItemId: 'existing-item-123',
                }),
            );
        });
    });

    describe('mapDraftItem', () => {
        let mockQueryRunner: any;

        beforeEach(() => {
            mockQueryRunner = {
                connect: jest.fn().mockResolvedValue(undefined),
                startTransaction: jest.fn().mockResolvedValue(undefined),
                commitTransaction: jest.fn().mockResolvedValue(undefined),
                rollbackTransaction: jest.fn().mockResolvedValue(undefined),
                release: jest.fn().mockResolvedValue(undefined),
                manager: {
                    create: jest.fn().mockImplementation((cls, dto) => ({ id: 'new-id', ...dto })),
                    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'saved-id', ...entity })),
                    findOne: jest.fn(),
                },
            };
            dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
        });

        it('TC-03: Atomic Promotion (CREATE_NEW)', async () => {
            const draft = {
                id: 'draft-1',
                dataProviderFeatureId: 'feature-1',
                title: 'New Discovered Keyboard',
                url: 'https://shopee.vn/keyboard',
                code: 'KEY-123',
                status: DraftItemStatus.NEW,
                dataProviderFeature: {
                    id: 'feature-1',
                    dataProviderId: 'provider-1',
                } as DataProviderFeatureEntity,
            } as DraftItemEntity;

            draftItemRepository.findOne.mockResolvedValue(draft);
            mockQueryRunner.manager.findOne.mockResolvedValue(null); // No existing dpItem

            const result = await service.mapDraftItem('draft-1', {
                action: MapDraftItemAction.CREATE_NEW,
                itemName: 'Custom Name Keyboard',
            });

            expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
            expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
                ItemEntity,
                expect.objectContaining({
                    name: 'Custom Name Keyboard',
                    code: 'KEY-123',
                    mappingStatus: ProductMappingStatus.MAPPED,
                }),
            );
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
            expect(result.status).toBe(DraftItemStatus.MAPPED);
        });

        it('TC-04: Idempotency on Already Mapped Draft', async () => {
            const draft = {
                id: 'draft-1',
                status: DraftItemStatus.MAPPED,
                dataProviderFeature: {
                    id: 'feature-1',
                    dataProviderId: 'provider-1',
                } as DataProviderFeatureEntity,
            } as DraftItemEntity;

            draftItemRepository.findOne.mockResolvedValue(draft);

            await expect(
                service.mapDraftItem('draft-1', {
                    action: MapDraftItemAction.CREATE_NEW,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('TC-05: Atomic Promotion (LINK_EXISTING)', async () => {
            const draft = {
                id: 'draft-1',
                dataProviderFeatureId: 'feature-1',
                title: 'Existing Discovered Keyboard',
                url: 'https://shopee.vn/keyboard',
                status: DraftItemStatus.SIMILAR,
                suggestedItemId: 'existing-item-1',
                dataProviderFeature: {
                    id: 'feature-1',
                    dataProviderId: 'provider-1',
                } as DataProviderFeatureEntity,
            } as DraftItemEntity;

            draftItemRepository.findOne.mockResolvedValue(draft);
            mockQueryRunner.manager.findOne
                .mockResolvedValueOnce({ id: 'existing-item-1', name: 'Existing Item' }) // item lookup
                .mockResolvedValueOnce(null); // dpItem lookup

            const result = await service.mapDraftItem('draft-1', {
                action: MapDraftItemAction.LINK_EXISTING,
                itemId: 'existing-item-1',
            });

            expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
                DataProviderItemEntity,
                expect.objectContaining({
                    dataProviderId: 'provider-1',
                    itemId: 'existing-item-1',
                    itemUrl: 'https://shopee.vn/keyboard',
                }),
            );
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
            expect(result.status).toBe(DraftItemStatus.MAPPED);
        });
    });
});
