import { DataSource } from 'typeorm';

import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderError } from '../../constants/data-provider-error';
import { DiscoveryUrlEntity } from '../../entities/discovery-url.entity';
import {
    DiscoveryUrlStatus,
    DiscoveryValidationStatus,
    FinalValidationStatus,
    MatchResultEnum,
    ValidationUserAction,
} from '../../enums';
import { DataProviderItemService } from '../data-provider-item.service';
import { DiscoveryUrlService } from '../discovery-url.service';
import { DiscoveryValidationLogService } from '../discovery-validation-log.service';
import { ItemService } from '../item.service';

describe('DiscoveryUrlService', () => {
    let service: DiscoveryUrlService;
    let urlRepo: any;
    let dataSource: any;
    let mapper: any;
    let itemService: any;
    let dataProviderItemService: any;
    let discoveryValidationLogService: any;

    beforeEach(() => {
        urlRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            count: jest.fn().mockResolvedValue(1),
        };

        dataSource = {
            transaction: jest.fn(async (cb) => {
                const manager = {
                    save: jest.fn().mockResolvedValue({}),
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                };
                return await cb(manager);
            }),
        };

        discoveryValidationLogService = {
            createValidationLog: jest.fn().mockReturnValue({ id: 'log-1' }),
            markPreviousLogsNotLatest: jest.fn().mockResolvedValue(undefined),
            getValidationLogsByUrl: jest.fn().mockResolvedValue([{ id: 'log-1', matchResult: MatchResultEnum.EXACT }]),
        };

        mapper = {
            map: jest.fn().mockImplementation((e: any) => e),
            mapArray: jest.fn().mockImplementation((a: any) => a),
        };

        itemService = {
            findListByFilter: jest.fn().mockResolvedValue([]),
            findOneByFilter: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'item-1', name: 'Product 1', code: 'SKU-1' }),
        };

        dataProviderItemService = {
            findListByFilter: jest.fn().mockResolvedValue([]),
            findOneByFilterAndOptions: jest.fn().mockResolvedValue(null),
            create: jest
                .fn()
                .mockResolvedValue({ id: 'dpi-1', itemId: 'item-1', dataProviderId: 'dp-1', itemUrl: 'https://example.com/p1?sku=SKU-1' }),
        };

        service = new DiscoveryUrlService(
            dataSource as unknown as DataSource,
            itemService as unknown as ItemService,
            dataProviderItemService as unknown as DataProviderItemService,
            discoveryValidationLogService as unknown as DiscoveryValidationLogService,
            mapper,
            urlRepo,
        );
    });

    describe('ingestDiscoveredUrl', () => {
        it('should throw AppException when url does not exist', async () => {
            urlRepo.findOne.mockResolvedValue(null);

            await expect(service.ingestDiscoveredUrl('missing-id')).rejects.toThrow(AppException);
        });

        it('should create new item and dataProviderItem when not existing', async () => {
            urlRepo.findOne.mockResolvedValue({
                id: 'url-1',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
                url: 'https://example.com/p1?sku=SKU-1',
                title: 'Product 1',
            });

            const result = await service.ingestDiscoveredUrl('url-1');

            expect(result.itemId).toBe('item-1');
            expect(result.dataProviderItemId).toBe('dpi-1');
            expect(result.isNewItem).toBe(true);
            expect(urlRepo.update).toHaveBeenCalledWith('url-1', { status: DiscoveryUrlStatus.INGESTED });
        });

        it('should reuse existing item if found by code or name', async () => {
            urlRepo.findOne.mockResolvedValue({
                id: 'url-1',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
                url: 'https://example.com/p1?sku=SKU-1',
                title: 'Product 1',
            });
            itemService.findListByFilter.mockResolvedValue([{ id: 'existing-item-id', code: 'SKU-1', name: 'Product 1' }]);
            dataProviderItemService.findOneByFilterAndOptions.mockResolvedValue({
                id: 'existing-dpi-id',
                itemId: 'existing-item-id',
                dataProviderId: 'dp-1',
                itemUrl: 'https://example.com/p1?sku=SKU-1',
            });

            const result = await service.ingestDiscoveredUrl('url-1');

            expect(result.itemId).toBe('existing-item-id');
            expect(result.dataProviderItemId).toBe('existing-dpi-id');
            expect(result.isNewItem).toBe(false);
            expect(itemService.create).not.toHaveBeenCalled();
        });
    });

    describe('ingestDiscoveredUrlsChunk', () => {
        it('should return empty array if urlIds is empty or no urls found', async () => {
            expect(await service.ingestDiscoveredUrlsChunk([])).toEqual([]);

            urlRepo.find.mockResolvedValue([]);
            expect(await service.ingestDiscoveredUrlsChunk(['url-1'])).toEqual([]);
        });

        it('should bulk process chunk of URLs and mark them INGESTED', async () => {
            urlRepo.find.mockResolvedValue([
                {
                    id: 'url-1',
                    sessionId: 'session-1',
                    dataProviderId: 'dp-1',
                    url: 'https://example.com/p1?sku=SKU-1',
                    title: 'Product 1',
                },
                {
                    id: 'url-2',
                    sessionId: 'session-1',
                    dataProviderId: 'dp-1',
                    url: 'https://example.com/p2?sku=SKU-2',
                    title: 'Product 2',
                },
            ]);

            itemService.findListByFilter.mockResolvedValue([]);
            itemService.create
                .mockResolvedValueOnce({ id: 'item-1', code: 'SKU-1', name: 'Product 1' })
                .mockResolvedValueOnce({ id: 'item-2', code: 'SKU-2', name: 'Product 2' });

            dataProviderItemService.findListByFilter.mockResolvedValue([]);
            dataProviderItemService.create
                .mockResolvedValueOnce({ id: 'dpi-1', itemId: 'item-1' })
                .mockResolvedValueOnce({ id: 'dpi-2', itemId: 'item-2' });

            const results = await service.ingestDiscoveredUrlsChunk(['url-1', 'url-2']);

            expect(results.length).toBe(2);
            expect(urlRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: expect.anything() }),
                { status: DiscoveryUrlStatus.INGESTED },
            );
        });
    });

    describe('updateStatus', () => {
        it('should return early when urlIds is empty', async () => {
            await service.updateStatus([], DiscoveryUrlStatus.INGESTED);
            expect(urlRepo.update).not.toHaveBeenCalled();
        });

        it('should update status for given urlIds', async () => {
            await service.updateStatus(['url-1'], DiscoveryUrlStatus.FAILED);
            expect(urlRepo.update).toHaveBeenCalled();
        });
    });

    describe('revalidateDiscoveredUrl', () => {
        it('should throw AppException when url is not found', async () => {
            urlRepo.findOne.mockResolvedValue(null);
            await expect(service.revalidateDiscoveredUrl('missing-id')).rejects.toThrow(AppException);
        });

        it('should perform revalidation and log audit entry', async () => {
            urlRepo.findOne.mockResolvedValue({
                id: 'url-1',
                sessionId: 'session-1',
                url: 'https://example.com/dp/B08HV6LK6X',
                title: 'Sony WH-1000XM4 Headphone',
                domain: 'example.com',
            });

            const result = await service.revalidateDiscoveredUrl('url-1', 'sony');

            expect(discoveryValidationLogService.markPreviousLogsNotLatest).toHaveBeenCalledWith({ discoveryUrlId: 'url-1' });
            expect(dataSource.transaction).toHaveBeenCalled();
            expect(result.validationStatus).toBe(DiscoveryValidationStatus.COMPLETED);
        });
    });

    describe('submitUserAction', () => {
        it('should update user action and trigger single ingest when CONFIRM', async () => {
            urlRepo.findOne.mockResolvedValue({
                id: 'url-1',
                sessionId: 'session-1',
                dataProviderId: 'dp-1',
                url: 'https://example.com/p1?sku=SKU-1',
                title: 'Product 1',
            });
            urlRepo.update.mockResolvedValue({ affected: 1 });

            const success = await service.submitUserAction('url-1', ValidationUserAction.CONFIRM, 'Looks good');

            expect(success).toBe(true);
            expect(urlRepo.update).toHaveBeenCalledWith(
                'url-1',
                expect.objectContaining({
                    userAction: ValidationUserAction.CONFIRM,
                    finalValidationStatus: FinalValidationStatus.APPROVED,
                }),
            );
        });

        it('should set status REJECTED without ingestion when REJECT', async () => {
            urlRepo.update.mockResolvedValue({ affected: 1 });

            const success = await service.submitUserAction('url-1', ValidationUserAction.REJECT, 'Not matched');

            expect(success).toBe(true);
            expect(urlRepo.update).toHaveBeenCalledWith(
                'url-1',
                expect.objectContaining({
                    userAction: ValidationUserAction.REJECT,
                    finalValidationStatus: FinalValidationStatus.REJECTED,
                }),
            );
        });
    });

    describe('submitBulkUserActions', () => {
        it('should bulk update actions and ingest chunk if action is CONFIRM', async () => {
            urlRepo.update.mockResolvedValue({ affected: 2 });
            urlRepo.find.mockResolvedValue([
                { id: 'url-1', url: 'https://example.com/1', title: 'Item 1', dataProviderId: 'dp-1' },
            ]);

            const success = await service.submitBulkUserActions(['url-1', 'url-2'], ValidationUserAction.CONFIRM);

            expect(success).toBe(true);
            expect(urlRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: expect.anything() }),
                expect.objectContaining({
                    userAction: ValidationUserAction.CONFIRM,
                    finalValidationStatus: FinalValidationStatus.APPROVED,
                }),
            );
        });
    });

    describe('getValidationLogsByUrl', () => {
        it('should delegate to discoveryValidationLogService', async () => {
            const logs = await service.getValidationLogsByUrl('url-1');

            expect(discoveryValidationLogService.getValidationLogsByUrl).toHaveBeenCalledWith('url-1');
            expect(logs).toHaveLength(1);
        });
    });
});
