import { Body, Controller, HttpCode, HttpStatus, Post, Put, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, BaseApiOkResponse, UUIDParam } from '../../../decorators';
import { ITEM_PAGINATION_CONFIG } from '../constants/item-pagination.config';
import { ItemDto } from '../dtos/item.dto';
import { CreateItemRequestDto, UpdateItemRequestDto } from '../dtos/requests';
import { ItemEntity } from '../entities/item.entity';
import { ItemService } from '../services/item.service';

@Controller('items')
@ApiTags('Items')
@Auth()
export class ItemController extends BaseController<ItemEntity, ItemDto> {
    constructor(private readonly itemService: ItemService) {
        super(itemService, ITEM_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Create item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @BaseApiOkResponse(ItemDto)
    public async create(@Body() request: CreateItemRequestDto): Promise<ItemDto> {
        const result = await this.itemService.create(request);
        return result;
    }

    @ApiOperation({ summary: 'Update item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @BaseApiOkResponse(Boolean)
    public async update(@UUIDParam('id') id: string, @Body() request: UpdateItemRequestDto): Promise<boolean> {
        const result = await this.itemService.update(id, request);
        return result;
    }
}
