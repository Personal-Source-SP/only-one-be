import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';
import * as path from 'path';

import { FileInterceptor } from '@nestjs/platform-express';
import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { FileHelper } from '../../../shared/helpers/file-helper';
import { ITEM_PAGINATION_CONFIG } from '../constants/item-pagination.config';
import { ItemDto } from '../dtos/item.dto';
import { CreateItemRequestDto, ImportItemRequestDto, ItemPaginationRequestDto, UpdateItemRequestDto } from '../dtos/requests';
import { ImportDataResponseDto, PreviewImportDataResponseDto } from '../dtos/responses';
import { ExcelFileTypes } from '../enums';
import { ItemService } from '../services/item.service';

@Controller('items')
@ApiTags('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ItemController extends BaseController {
    constructor(
        private readonly fileHelper: FileHelper,
        private readonly itemService: ItemService,
    ) {
        super();
    }

    @ApiOperation({ summary: 'Download item import template' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('import-template')
    @ApiOkResponse({ type: String })
    async createImportTemplate(@Query('format') format: string = 'xlsx', @Res() res: Response): Promise<string> {
        const filePath = await this.itemService.createImportTemplate(format);
        await this.fileHelper.sendFileAsDownload(res, filePath, `import-item-template${format}`);

        return filePath;
    }

    @ApiOperation({ summary: 'Get all items' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('all')
    @ApiOkResponse({ type: [ItemDto] })
    public async getAll(): Promise<ItemDto[]> {
        const result = await this.itemService.getAll();
        return result;
    }

    @ApiOperation({ summary: 'Get item by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id')
    @ApiOkResponse({ type: ItemDto })
    public async getItemById(@Param('id', new ParseUUIDPipe()) id: string): Promise<ItemDto> {
        const result = await this.itemService.getById(id);
        return result;
    }

    @ApiOperation({ summary: 'Get paginated items' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkPaginatedResponse(ItemDto, ITEM_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(ItemDto, ITEM_PAGINATION_CONFIG)
    @ApiPaginationQuery(ITEM_PAGINATION_CONFIG)
    public async getItemsPagination(@Paginate() query: ItemPaginationRequestDto): Promise<Paginated<ItemDto>> {
        const result = await this.itemService.getItemsPagination(query, ITEM_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({
        summary: 'Preview import data from file',
        description: 'Preview import data based on barcode from file upload',
    })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('preview-import-data')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const uploadDir = path.resolve(process.cwd(), 'uploads');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    cb(null, uploadDir);
                },
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    cb(null, `item-import-${uniqueSuffix}${ext}`);
                },
            }),
            limits: {
                fileSize: 1024 * 1024 * 20,
            },
            fileFilter: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                if (![ExcelFileTypes.XLSX, ExcelFileTypes.XLS, ExcelFileTypes.CSV].includes(ext as ExcelFileTypes)) {
                    return cb(new BadRequestException('Only Excel files are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    @ApiOkResponse({ type: PreviewImportDataResponseDto })
    async previewImportData(@UploadedFile() file: Express.Multer.File): Promise<PreviewImportDataResponseDto> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        try {
            const result = await this.itemService.previewImportData(file.path);

            fs.unlinkSync(file.path);

            return result;
        } catch (error) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            throw new BadRequestException(`Failed to preview sales info: ${error.message}`);
        }
    }

    @ApiOperation({
        summary: 'Import item data from request',
        description: 'Import item data based on barcode from request',
    })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('import-item-data')
    @ApiOkResponse({ type: ImportDataResponseDto })
    public async importItemData(@Body() request: ImportItemRequestDto): Promise<ImportDataResponseDto> {
        const result = await this.itemService.importItemData(request);
        return result;
    }

    @ApiOperation({ summary: 'Create item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @ApiOkResponse({ type: ItemDto })
    public async createItem(@Body() request: CreateItemRequestDto): Promise<ItemDto> {
        const result = await this.itemService.createItem(request);
        return result;
    }

    @ApiOperation({ summary: 'Update item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @ApiOkResponse({ type: Boolean })
    public async updateItem(@Param('id', new ParseUUIDPipe()) id: string, @Body() request: UpdateItemRequestDto): Promise<boolean> {
        const result = await this.itemService.updateItem(id, request);
        return result;
    }

    @ApiOperation({ summary: 'Delete item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':id')
    @ApiOkResponse({ type: Boolean })
    public async deleteItem(@Param('id', new ParseUUIDPipe()) id: string): Promise<boolean> {
        const result = await this.itemService.deleteItem(id);
        return result;
    }
}
