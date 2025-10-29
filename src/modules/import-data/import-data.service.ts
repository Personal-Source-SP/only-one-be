import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { keyBy } from 'lodash';
import * as path from 'path';
import { In } from 'typeorm';
import { LoggerService } from '../../shared/services/logger.service';
import { DataProviderItemDto } from '../data-provider/dtos/data-provider-item.dto';
import { ItemDto } from '../data-provider/dtos/item.dto';
import { DataProviderItemEntity } from '../data-provider/entities/data-provider-item.entity';
import { ItemEntity } from '../data-provider/entities/item.entity';
import { ExcelFileTypes, ProductMappingStatus } from '../data-provider/enums';
import { DataProviderItemService } from '../data-provider/services/data-provider-item.service';
import { DataProviderService } from '../data-provider/services/data-provider.service';
import { ItemService } from '../data-provider/services/item.service';
import { ImportDataRequestDto } from './dtos/requests/import-data-request.dto';
import { ImportDataResponseDto, PreviewImportDataResponseDto } from './dtos/responses';
import { ImportDataType } from './enums';

@Injectable()
export class ImportDataService {
    constructor(
        private readonly itemService: ItemService,
        private readonly loggerService: LoggerService,
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
                case ImportDataType.ITEM:
                    return this.previewItem(worksheet);
                case ImportDataType.DATA_PROVIDER_ITEM:
                    return this.previewDataProviderItem(worksheet);
                default:
                    throw new BadRequestException('Invalid import data type');
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
                case ImportDataType.ITEM:
                    return this.importItemData(request);
                case ImportDataType.DATA_PROVIDER_ITEM:
                    return this.importDataProviderItemData(request);
                default:
                    throw new BadRequestException('Invalid import data type');
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
