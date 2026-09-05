import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { difference, keyBy } from 'lodash';
import * as path from 'path';
import { In } from 'typeorm';

import { AppException } from '../../../exceptions/app.exception';
import { LoggerService } from '../../../shared/services/logger.service';
import { DataProviderItemDto } from '../../data-provider/dtos/data-provider-item.dto';
import { ItemDto } from '../../data-provider/dtos/item.dto';
import { DataProviderItemEntity } from '../../data-provider/entities/data-provider-item.entity';
import { ItemEntity } from '../../data-provider/entities/item.entity';
import { ExcelFileTypes, ProductMappingStatus } from '../../data-provider/enums';
import { DataProviderService } from '../../data-provider/services/data-provider.service';
import { DataProviderItemService } from '../../data-provider/services/data-provider-item.service';
import { ItemService } from '../../data-provider/services/item.service';
import { ImportDataError } from '../constants/import-data-error';
import { ImportDataRequestDto } from '../dtos/requests/import-data-request.dto';
import { ImportDataResponseDto, PreviewImportDataProviderItem, PreviewImportDataResponseDto } from '../dtos/responses';
import { ImportDataType } from '../enums';

@Injectable()
export class ImportDataService {
    private readonly loggerService: LoggerService = new LoggerService(ImportDataService.name);

    constructor(
        private readonly itemService: ItemService,
        private readonly dataProviderService: DataProviderService,
        private readonly dataProviderItemService: DataProviderItemService,

        @InjectMapper() private readonly mapper: Mapper,
    ) {}

    async previewImportData(filePath: string, type: ImportDataType): Promise<PreviewImportDataResponseDto> {
        const workbook = new ExcelJS.Workbook();
        const ext = path.extname(filePath).toLowerCase();

        if (ext === ExcelFileTypes.CSV) {
            await workbook.csv.readFile(filePath);
        } else {
            await workbook.xlsx.readFile(filePath);
        }

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return new PreviewImportDataResponseDto({
                data: [],
                errorMessage: 'No worksheet found in the file',
            });
        }
        try {
            switch (type) {
                case ImportDataType.DATA_PROVIDER:
                    return this.previewDataProvider(worksheet);
                case ImportDataType.ITEM:
                    return this.previewItem(worksheet);
                case ImportDataType.DATA_PROVIDER_ITEM:
                    return this.previewDataProviderItem(worksheet);
                default:
                    throw new AppException(ImportDataError.InvalidImportFormat);
            }
        } catch (error) {
            this.loggerService.error(`Failed to preview import data: ${error.message}`);
            return new PreviewImportDataResponseDto({
                data: [],
                errorMessage: error?.message || 'Failed to preview import data',
            });
        }
    }

    async importData(request: ImportDataRequestDto): Promise<ImportDataResponseDto> {
        try {
            switch (request.dataType) {
                case ImportDataType.DATA_PROVIDER:
                    return this.importDataProviderData(request);
                case ImportDataType.ITEM:
                    return this.importItemData(request);
                case ImportDataType.DATA_PROVIDER_ITEM:
                    return this.importDataProviderItemData(request);
                default:
                    throw new AppException(ImportDataError.InvalidImportFormat);
            }
        } catch (error) {
            this.loggerService.error(`Failed to import items: ${error.message}`);

            return new ImportDataResponseDto({
                updated: 0,
                success: false,
                message: error?.message || 'Failed to import items',
            });
        }
    }

    private async previewDataProvider(worksheet: ExcelJS.Worksheet): Promise<PreviewImportDataResponseDto> {
        let identifierCol: number | null = null;
        let itemNameCol: number | null = null;
        let itemCodeCol: number | null = null;
        let itemUrlCol: number | null = null;
        let headerRowNumber: number | null = null;

        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);

            let candidateIdentifierCol: number | null = null;
            let candidateItemNameCol: number | null = null;
            let candidateItemCodeCol: number | null = null;
            let candidateItemUrlCol: number | null = null;

            row.eachCell((cell, colNumber) => {
                const raw = cell.value;

                if (this.isHeaderMatch(raw, ['DATA PROVIDER IDENTIFIER', 'PROVIDER IDENTIFIER', 'IDENTIFIER', 'MÃ NHÀ CUNG CẤP'])) {
                    candidateIdentifierCol = colNumber;
                }

                if (this.isHeaderMatch(raw, ['ITEM NAME', 'NAME', 'TÊN', 'TÊN SẢN PHẨM'])) {
                    candidateItemNameCol = colNumber;
                }

                if (this.isHeaderMatch(raw, ['ITEM CODE', 'CODE', 'MÃ', 'MÃ SẢN PHẨM'])) {
                    candidateItemCodeCol = colNumber;
                }

                if (this.isHeaderMatch(raw, ['ITEM URL', 'URL'])) {
                    candidateItemUrlCol = colNumber;
                }
            });

            if (candidateIdentifierCol && candidateItemNameCol && candidateItemCodeCol && candidateItemUrlCol) {
                headerRowNumber = i;

                identifierCol = candidateIdentifierCol;
                itemNameCol = candidateItemNameCol;
                itemCodeCol = candidateItemCodeCol;
                itemUrlCol = candidateItemUrlCol;

                break;
            }
        }

        if (!identifierCol || !itemNameCol || !itemCodeCol || !itemUrlCol || !headerRowNumber) {
            return new PreviewImportDataResponseDto({
                data: [],
                errorMessage: 'Required columns not found: provider identifier, item name, item code, item url',
            });
        }

        const itemCodes: string[] = [];
        const identifiers: string[] = [];
        const rows: Array<{
            itemUrl: string;
            itemName: string;
            itemCode: string;
            dataProviderIdentifier: string;
        }> = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowNumber!) return;

            const itemUrl = row.getCell(itemUrlCol!)?.value?.toString().trim();
            const itemName = row.getCell(itemNameCol!)?.value?.toString().trim();
            const itemCode = row.getCell(itemCodeCol!)?.value?.toString().trim();
            const dataProviderIdentifier = row.getCell(identifierCol!)?.value?.toString().trim();

            if (dataProviderIdentifier && itemName && itemCode && itemUrl) {
                itemCodes.push(itemCode);
                identifiers.push(dataProviderIdentifier);

                rows.push({
                    itemUrl,
                    itemName,
                    itemCode,
                    dataProviderIdentifier,
                });
            }
        });

        if (!rows.length) {
            return new PreviewImportDataResponseDto({
                data: [],
                errorMessage: 'No valid data rows found',
            });
        }

        const items = await this.itemService.findListByFilter({ code: In(itemCodes) });
        const dataProviders = await this.dataProviderService.findListByFilter({ identifier: In(identifiers) });

        const itemMap = keyBy(items, 'code');
        const dataProviderMap = keyBy(dataProviders, 'identifier');

        const data: PreviewImportDataProviderItem[] = rows.flatMap((r) => {
            const provider = r.dataProviderIdentifier ? dataProviderMap[r.dataProviderIdentifier] : undefined;
            if (!provider) return [];

            const item = r.itemCode ? itemMap[r.itemCode] : undefined;

            return new PreviewImportDataProviderItem({
                itemUrl: r.itemUrl,
                itemName: r.itemName,
                itemCode: r.itemCode,
                itemId: item?.id,
                dataProviderId: provider.id,
                dataProviderName: provider.name,
                dataProviderIdentifier: provider.identifier,
            });
        });

        return new PreviewImportDataResponseDto({
            data,
            statistics: {
                overridden: 0,
                updates: data.length,
                errors: worksheet.rowCount - data.length,
            },
        });
    }

    private async previewItem(worksheet: ExcelJS.Worksheet): Promise<PreviewImportDataResponseDto> {
        let nameCol: number | null = null;
        let codeCol: number | null = null;
        let headerRowNumber: number | null = null;

        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);

            let candidateNameCol: number | null = null;
            let candidateCodeCol: number | null = null;

            row.eachCell((cell, colNumber) => {
                const raw = cell.value;

                if (this.isHeaderMatch(raw, ['TÊN', 'TÊN SẢN PHẨM'])) {
                    candidateNameCol = colNumber;
                }

                if (this.isHeaderMatch(raw, ['MÃ', 'MÃ SẢN PHẨM'])) {
                    candidateCodeCol = colNumber;
                }
            });

            if (candidateNameCol && candidateCodeCol) {
                headerRowNumber = i;
                nameCol = candidateNameCol;
                codeCol = candidateCodeCol;

                break;
            }
        }

        if (!nameCol || !codeCol || !headerRowNumber) {
            return new PreviewImportDataResponseDto({
                data: [],
                errorMessage: 'Name or code column not found in the file',
            });
        }

        const itemData: ItemDto[] = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowNumber!) return;

            const code = row.getCell(codeCol!)?.value?.toString().trim();
            const name = row.getCell(nameCol!)?.value?.toString().trim();

            if (code && name) {
                itemData.push({
                    code: code,
                    name: name,
                    mappingStatus: ProductMappingStatus.UNMAPPED,
                });
            }
        });

        const codes = itemData.map((item) => item.code);
        const overridden = await this.itemService.count({ code: In(codes) });

        return new PreviewImportDataResponseDto({
            data: itemData,
            statistics: {
                overridden,
                updates: itemData.length,
                errors: worksheet.rowCount - itemData.length,
            },
        });
    }

    private async previewDataProviderItem(worksheet: ExcelJS.Worksheet): Promise<PreviewImportDataResponseDto> {
        let urlCol: number | null = null;
        let itemNameCol: number | null = null;
        let headerRowNumber: number | null = null;
        let dataProviderNameCol: number | null = null;

        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);

            let candidateUrlCol: number | null = null;
            let candidateItemNameCol: number | null = null;
            let candidateDataProviderNameCol: number | null = null;

            row.eachCell((cell, colNumber) => {
                const raw = cell.value;

                if (this.isHeaderMatch(raw, ['TÊN ĐỐI TƯỢNG', 'TÊN'])) {
                    candidateItemNameCol = colNumber;
                }

                if (this.isHeaderMatch(raw, ['TÊN NHÀ CUNG CẤP', 'TÊN NHÀ CUNG CẤP'])) {
                    candidateDataProviderNameCol = colNumber;
                }

                if (this.isHeaderMatch(raw, ['URL', 'URL'])) {
                    candidateUrlCol = colNumber;
                }
            });

            if (candidateItemNameCol && candidateDataProviderNameCol && candidateUrlCol) {
                headerRowNumber = i;

                urlCol = candidateUrlCol;
                itemNameCol = candidateItemNameCol;
                dataProviderNameCol = candidateDataProviderNameCol;

                break;
            }
        }

        if (!itemNameCol || !dataProviderNameCol || !urlCol || !headerRowNumber) {
            return new PreviewImportDataResponseDto({
                data: [],
                errorMessage: 'Item name, data provider name, or url column not found in the file',
            });
        }

        const data = [];
        const itemNames: string[] = [];
        const dataProviderNames: string[] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowNumber!) return;

            const url = row.getCell(urlCol!)?.value?.toString().trim();
            const itemName = row.getCell(itemNameCol!)?.value?.toString().trim();
            const dataProviderName = row.getCell(dataProviderNameCol!)?.value?.toString().trim();

            if (itemName && dataProviderName && url) {
                itemNames.push(itemName);
                dataProviderNames.push(dataProviderName);

                data.push({
                    url,
                    itemName,
                    dataProviderName,
                });
            }
        });

        const items = await this.itemService.findListByFilter({ name: In(itemNames) });
        const dataProviders = await this.dataProviderService.findListByFilter({ name: In(dataProviderNames) });

        const itemMap = keyBy(items, 'name');
        const dataProviderMap = keyBy(dataProviders, 'name');

        const dataProviderItemEntities = data.flatMap(({ url, itemName, dataProviderName }) => {
            const item = itemMap[itemName];
            const dataProvider = dataProviderMap[dataProviderName];

            if (!item || !dataProvider) {
                return [];
            }

            return [
                {
                    itemUrl: url,
                    itemId: item.id,
                    dataProviderId: dataProvider.id,
                },
            ];
        });

        if (!dataProviderItemEntities?.length) {
            return new PreviewImportDataResponseDto({
                data: [],
                errorMessage: 'No data provider items found',
            });
        }

        const urls = dataProviderItemEntities.map((item) => item.itemUrl);
        const overridden = await this.dataProviderItemService.count({ itemUrl: In(urls) });

        return new PreviewImportDataResponseDto({
            data: dataProviderItemEntities,
            statistics: {
                overridden,
                updates: dataProviderItemEntities.length,
                errors: worksheet.rowCount - dataProviderItemEntities.length,
            },
        });
    }

    private async importDataProviderData(request: ImportDataRequestDto): Promise<ImportDataResponseDto> {
        const data = request.data as PreviewImportDataProviderItem[];

        try {
            const newItemEntities: ItemEntity[] = data
                ?.filter((item) => !item.itemId)
                ?.map((item) => {
                    return this.itemService.repository.create({
                        name: item.itemName,
                        code: item.itemCode,
                        mappingStatus: ProductMappingStatus.UNMAPPED,
                    });
                });

            // Create new items
            if (newItemEntities?.length) {
                const codes = newItemEntities.map((item) => item.code);
                const codeExists = await this.itemService.findListByFilter({ code: In(codes) }, { select: { code: true } });

                const newCodes = difference(codes, codeExists?.map((item) => item.code) || []);
                const saveItemEntities = newItemEntities.filter((item) => newCodes.includes(item.code));

                if (saveItemEntities?.length) {
                    const result = await this.itemService.createMany(saveItemEntities);

                    if (!result?.length) {
                        return new ImportDataResponseDto({
                            updated: 0,
                            success: false,
                            message: 'Failed to import items',
                        });
                    }
                }
            }

            const dataProviderItemEntities: DataProviderItemEntity[] = data
                ?.filter((item) => !item.dataProviderId)
                ?.map((item) => {
                    return this.dataProviderItemService.repository.create({
                        itemId: item.itemId,
                        itemUrl: item.itemUrl,
                        dataProviderId: item.dataProviderId,
                    });
                });

            // Check if there are any data provider items to import
            if (!dataProviderItemEntities?.length) {
                return new ImportDataResponseDto({
                    updated: 0,
                    success: false,
                    message: 'No data provider items to import',
                });
            }

            // Create new data provider items
            const conditions = dataProviderItemEntities.map((item) => ({
                itemId: item.itemId,
                dataProviderId: item.dataProviderId,
            }));
            const dataProviderItemExists = await this.dataProviderItemService.repository.find({
                where: conditions,
            });

            const newDataProviderItemEntities = dataProviderItemEntities.filter(
                (item) =>
                    !dataProviderItemExists.some(
                        (exists) => exists.itemId === item.itemId && exists.dataProviderId === item.dataProviderId,
                    ),
            );

            if (!newDataProviderItemEntities?.length) {
                return new ImportDataResponseDto({
                    updated: 0,
                    success: false,
                    message: 'No data provider items to import',
                });
            }

            const result = await this.dataProviderItemService.createMany(newDataProviderItemEntities);
            if (!result?.length) {
                return new ImportDataResponseDto({
                    updated: 0,
                    success: false,
                    message: 'Failed to import data provider items',
                });
            }

            return new ImportDataResponseDto({
                success: true,
                message: 'Items imported successfully',
                updated: dataProviderItemEntities?.length || 0,
            });
        } catch (error) {
            this.loggerService.error(`Failed to import items: ${error.message}`);

            return new ImportDataResponseDto({
                updated: 0,
                success: false,
                message: error?.message || 'Failed to import items',
            });
        }
    }

    private async importItemData(request: ImportDataRequestDto): Promise<ImportDataResponseDto> {
        const items = request.data as ItemDto[];

        try {
            const itemEntities = this.mapper.mapArray(items, ItemDto, ItemEntity);
            const result = await this.itemService.createMany(itemEntities);

            return new ImportDataResponseDto({
                success: true,
                updated: result.length,
                message: 'Items imported successfully',
            });
        } catch (error) {
            this.loggerService.error(`Failed to import items: ${error.message}`);

            return new ImportDataResponseDto({
                updated: 0,
                success: false,
                message: error?.message || 'Failed to import items',
            });
        }
    }

    private async importDataProviderItemData(request: ImportDataRequestDto): Promise<ImportDataResponseDto> {
        const items = request.data as DataProviderItemDto[];

        try {
            const dataProviderItemEntities = this.mapper.mapArray(items, DataProviderItemDto, DataProviderItemEntity);
            const result = await this.dataProviderItemService.createMany(dataProviderItemEntities);

            return new ImportDataResponseDto({
                success: true,
                updated: result.length,
                message: 'Data provider items imported successfully',
            });
        } catch (error) {
            this.loggerService.error(`Failed to import data provider items: ${error.message}`);

            return new ImportDataResponseDto({
                updated: 0,
                success: false,
                message: error?.message || 'Failed to import data provider items',
            });
        }
    }

    private isHeaderMatch = (value: ExcelJS.CellValue, targets: string[]): boolean => {
        const v = value?.toString().trim().toUpperCase();
        if (!v) return false;

        return targets.some((target) => {
            const t = target.toUpperCase();
            return v === t || v.includes(t);
        });
    };
}
