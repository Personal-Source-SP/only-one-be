import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import * as path from 'path';
import { In, Not, Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { ItemDto } from '../dtos/item.dto';
import { CreateItemRequestDto, ImportItemRequestDto, ItemPaginationRequestDto, UpdateItemRequestDto } from '../dtos/requests';
import { ImportDataResponseDto, PreviewImportDataResponseDto } from '../dtos/responses';
import { ItemEntity } from '../entities/item.entity';
import { ExcelFileTypes, ProductMappingStatus } from '../enums';
import { parseBooleanFilter, parseFilterValueToArray } from '../utils/query.utils';

@Injectable()
export class ItemService extends BaseService<ItemEntity> {
    constructor(
        private readonly loggerService: LoggerService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(ItemEntity)
        private readonly itemRepository: Repository<ItemEntity>,
    ) {
        super(itemRepository);
    }

    async getById(id: string): Promise<ItemDto> {
        const item = await this.findById(id);
        if (!item) {
            this.loggerService.error(`No item found with id ${id}`);
            return null;
        }

        return this.mapper.map(item, ItemEntity, ItemDto);
    }

    async getAll(): Promise<ItemDto[]> {
        const items = await this.findAll();
        return this.mapper.mapArray(items, ItemEntity, ItemDto);
    }

    async getItemsPagination(query: ItemPaginationRequestDto, globalConfig: PaginateConfig<ItemEntity>): Promise<Paginated<ItemDto>> {
        try {
            const queryBuilder = this.itemRepository.createQueryBuilder('item');

            // Handle tags filter
            const tags = parseFilterValueToArray(query.filter?.tags);
            if (tags?.length) {
                queryBuilder.andWhere('item.tags::jsonb ?| ARRAY[:...tags]', { tags });
                delete query.filter.tags;
            }

            // Handle showDuplicates filter
            const showDuplicates = parseBooleanFilter(
                Array.isArray(query.filter?.showDuplicates) ? query.filter?.showDuplicates[0] : query.filter?.showDuplicates,
            );
            if (showDuplicates) {
                queryBuilder.andWhere(`
                    EXISTS (
                        SELECT 1 
                        FROM items i2 
                        WHERE i2.name = item.name 
                        AND i2.id != item.id
                    )
                `);
                delete query.filter.showDuplicates;
            }

            const paginatedResult: Paginated<ItemEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                queryBuilder,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, ItemEntity, ItemDto);
            return { ...paginatedResult, data } as Paginated<ItemDto>;
        } catch (error) {
            this.loggerService.error(`Get items pagination error: ${error?.message}`);
            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async createItem(request: CreateItemRequestDto): Promise<ItemDto> {
        // Check if item with same code already exists
        if (request.code) {
            const existingItem = await this.count({ code: request.code });
            if (existingItem > 0) {
                throw new ConflictException(`Item with code ${request.code} already exists`);
            }
        }

        try {
            const itemEntity = this.mapper.map(request, CreateItemRequestDto, ItemEntity);
            const item = await this.create(itemEntity);

            return this.mapper.map(item, ItemEntity, ItemDto);
        } catch (error) {
            this.loggerService.error(`Create item error: ${error?.message}`);
            throw error;
        }
    }

    async updateItem(id: string, request: UpdateItemRequestDto): Promise<boolean> {
        const existingItem = await this.exists({ id });
        if (!existingItem) {
            this.loggerService.error(`No item found with id ${id}`);
            throw new NotFoundException('No item found with id');
        }

        // Check if code is being updated and if it already exists
        if (request.code !== undefined) {
            const existing = await this.count({ code: request.code, id: Not(id) });
            if (existing > 0) {
                this.loggerService.error(`Item with code ${request.code} already exists`);
                throw new ConflictException(`Item with code ${request.code} already exists`);
            }
        }

        const updatedItem = await this.update(id, request);
        return updatedItem;
    }

    async deleteItem(id: string): Promise<boolean> {
        const existingItem = await this.exists({ id });
        if (!existingItem) {
            this.loggerService.error(`No item found with id ${id}`);
            throw new NotFoundException('No item found with id');
        }

        return this.delete(id);
    }

    async previewImportData(filePath: string): Promise<PreviewImportDataResponseDto> {
        // Load the workbook
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
                items: [],
                errorMessage: 'No worksheet found in the file',
            });
        }

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
                items: [],
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
        const overridden = await this.count({ code: In(codes) });

        return new PreviewImportDataResponseDto({
            items: itemData,
            statistics: {
                overridden,
                updates: itemData.length,
                errors: worksheet.rowCount - itemData.length,
            },
        });
    }

    async importItemData(request: ImportItemRequestDto): Promise<ImportDataResponseDto> {
        try {
            const itemEntities = this.mapper.mapArray(request.items, ItemDto, ItemEntity);
            const result = await this.itemRepository.save(itemEntities);

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
