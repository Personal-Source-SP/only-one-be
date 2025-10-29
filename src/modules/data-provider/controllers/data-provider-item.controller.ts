import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DATA_PROVIDER_ITEM_PAGINATION_CONFIG } from '../constants/data-provider-item-pagination.config';
import { DataProviderItemDto } from '../dtos/data-provider-item.dto';
import { CreateDataProviderItemRequestDto, UpdateDataProviderItemRequestDto } from '../dtos/requests';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';
import { DataProviderItemService } from '../services/data-provider-item.service';

@Controller('data-provider-items')
@ApiTags('data-provider-items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataProviderItemController extends BaseController<DataProviderItemEntity, DataProviderItemDto> {
    constructor(private readonly dataProviderItemService: DataProviderItemService) {
        super(dataProviderItemService, DATA_PROVIDER_ITEM_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Get data provider items by data provider id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('data-provider/:dataProviderId')
    @BaseApiOkResponse(DataProviderItemDto, { isArray: true })
    public async getByDataProviderId(@Param('dataProviderId', new ParseUUIDPipe()) dataProviderId: string): Promise<DataProviderItemDto[]> {
        const result = await this.dataProviderItemService.findListByFilter({ dataProviderId }, { relations: { dataProvider: true } });
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

    @ApiOperation({ summary: 'Update data provider item' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @BaseApiOkResponse(Boolean)
    public async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() request: UpdateDataProviderItemRequestDto): Promise<boolean> {
        const result = await this.dataProviderItemService.update(id, request);
        return result;
    }
}
