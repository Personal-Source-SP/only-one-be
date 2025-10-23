import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { ITEM_PAGINATION_CONFIG } from '../constants/item-pagination.config';
import { ItemDto } from '../dtos/item.dto';
import { CreateItemRequestDto, ItemPaginationRequestDto, UpdateItemRequestDto } from '../dtos/requests';
import { ItemService } from '../services/item.service';

@Controller('items')
@ApiTags('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ItemController extends BaseController {
    constructor(private readonly itemService: ItemService) {
        super();
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
