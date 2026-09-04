import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseBoolPipe, Post, Put, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, BaseApiOkResponse, UUIDParam } from '../../../decorators';
import { DATA_PROVIDER_ITEM_PAGINATION_CONFIG } from '../constants/data-provider-item-pagination.config';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { CreateDataProviderItemRequestDto, UpdateDataProviderItemRequestDto } from '../dtos/requests';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderItemService } from '../services/data-provider-item.service';

@Controller('data-provider-items')
@ApiTags('Data Provider Items')
@Auth()
export class DataProviderItemController extends BaseController<DataProviderItemEntity, DataProviderItemDto> {
    constructor(private readonly dataProviderItemService: DataProviderItemService) {
        super(dataProviderItemService, DATA_PROVIDER_ITEM_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Get data provider items by data provider id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('data-provider/:dataProviderId')
    @BaseApiOkResponse(DataProviderItemDto, { isArray: true })
    public async getByDataProviderId(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderItemDto[]> {
        const result = await this.dataProviderItemService.findListByFilter({ dataProviderId }, { relations: { dataProvider: true } });
        return result;
    }

    @ApiOperation({ summary: 'Get data provider items by item id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('item/:itemId')
    @BaseApiOkResponse(DataProviderItemDto, { isArray: true })
    public async getByItemId(@UUIDParam('itemId') itemId: string): Promise<DataProviderItemDto[]> {
        const result = await this.dataProviderItemService.findListByFilter({ itemId }, { relations: { item: true } });
        return result;
    }

    @ApiOperation({ summary: 'Create data provider item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @BaseApiOkResponse(DataProviderItemDto)
    public async create(@Body() request: CreateDataProviderItemRequestDto): Promise<DataProviderItemDto> {
        const result = await this.dataProviderItemService.create(request);
        return result;
    }

    @ApiOperation({ summary: 'Switch active status data provider item' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Put(':id/switch-status/:activeStatus')
    @BaseApiOkResponse(Boolean)
    public async switchActiveStatus(
        @Param('activeStatus', new ParseBoolPipe()) activeStatus: boolean,
        @UUIDParam('id') id: string,
    ): Promise<boolean> {
        const result = await this.dataProviderItemService.switchActiveStatus(id, activeStatus);
        return result;
    }

    @ApiOperation({ summary: 'Update data provider item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @BaseApiOkResponse(Boolean)
    public async update(@UUIDParam('id') id: string, @Body() request: UpdateDataProviderItemRequestDto): Promise<boolean> {
        const result = await this.dataProviderItemService.update(id, request);
        return result;
    }
}
