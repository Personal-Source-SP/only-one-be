import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DATA_PROVIDER_ITEM_PAGINATION_CONFIG } from '../constants/data-provider-item-pagination.config';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { DataProviderItemPaginationRequestDto, UpdateDataProviderItemRequestDto } from '../dtos/requests';
import { DataProviderItemService } from '../services/data-provider-item.service';

@Controller('data-provider-item')
@ApiTags('data-provider-item')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataProviderItemController extends BaseController {
    constructor(private readonly dataProviderItemService: DataProviderItemService) {
        super();
    }

    @ApiOperation({ summary: 'Get data provider item by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id')
    @ApiOkResponse({ type: DataProviderItemDto })
    public async getDataProviderItemById(@Param('id', new ParseUUIDPipe()) id: string): Promise<DataProviderItemDto> {
        const result = await this.dataProviderItemService.getById(id);
        return result;
    }

    @ApiOperation({ summary: 'Get paginated data provider items' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkPaginatedResponse(DataProviderItemDto, DATA_PROVIDER_ITEM_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(DataProviderItemDto, DATA_PROVIDER_ITEM_PAGINATION_CONFIG)
    @ApiPaginationQuery(DATA_PROVIDER_ITEM_PAGINATION_CONFIG)
    public async getDataProviderItemsPagination(
        @Paginate() query: DataProviderItemPaginationRequestDto,
    ): Promise<Paginated<DataProviderItemDto>> {
        const result = await this.dataProviderItemService.getDataProviderItemsPagination(query, DATA_PROVIDER_ITEM_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({ summary: 'Update data provider item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @ApiOkResponse({ type: Boolean })
    public async updateDataProviderItem(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: UpdateDataProviderItemRequestDto,
    ): Promise<boolean> {
        const result = await this.dataProviderItemService.updateDataProviderItem(id, request);
        return result;
    }

    @ApiOperation({ summary: 'Delete data provider item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':id')
    @ApiOkResponse({ type: Boolean })
    public async deleteDataProviderItem(@Param('id', new ParseUUIDPipe()) id: string): Promise<boolean> {
        const result = await this.dataProviderItemService.deleteDataProviderItem(id);
        return result;
    }
}
