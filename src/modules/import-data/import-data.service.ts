import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { In } from 'typeorm';
import { LoggerService } from '../../shared/services/logger.service';
import { ItemDto } from '../data-provider/dtos/item.dto';
import { ItemEntity } from '../data-provider/entities/item.entity';
import { ExcelFileTypes, ProductMappingStatus } from '../data-provider/enums';
import { ItemService } from '../data-provider/services/item.service';
import { ImportDataRequestDto } from './dtos/requests/import-data-request.dto';
import { ImportDataResponseDto, PreviewImportDataResponseDto } from './dtos/responses';
import { ImportDataType } from './enums';

@Injectable()
export class ImportDataService {
    constructor(
        private readonly itemService: ItemService,
        private readonly loggerService: LoggerService,

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

                if (this.isHeaderMatch(raw, ['Tên', 'Tên sản phẩm'])) {
                    candidateNameCol = colNumber;
                }

                if (this.isHeaderMatch(raw, ['Mã', 'Mã sản phẩm'])) {
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

    private isHeaderMatch = (value: ExcelJS.CellValue, targets: string[]): boolean => {
        const v = value?.toString().trim().toUpperCase();
        if (!v) return false;

        return targets.some((target) => {
            const t = target.toUpperCase();
            return v === t || v.includes(t);
        });
    };
}
