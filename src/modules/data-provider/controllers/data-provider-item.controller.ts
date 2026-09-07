import { Body, Controller, Param, ParseBoolPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, GetRestApi, PostRestApi, PutRestApi, UUIDParam } from '../../../decorators';
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

    @GetRestApi({
        path: 'data-provider/:dataProviderId',
        summary: 'Get data provider items by data provider id',
        responseDto: DataProviderItemDto,
        isArray: true,
    })
    async getByDataProviderId(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderItemDto[]> {
        const result = await this.dataProviderItemService.findListByFilter({ dataProviderId }, { relations: { dataProvider: true } });
        return result;
    }

    @GetRestApi({
        path: 'item/:itemId',
        summary: 'Get data provider items by item id',
        responseDto: DataProviderItemDto,
        isArray: true,
    })
    async getByItemId(@UUIDParam('itemId') itemId: string): Promise<DataProviderItemDto[]> {
        const result = await this.dataProviderItemService.findListByFilter({ itemId }, { relations: { item: true } });
        return result;
    }

    @PostRestApi({
        summary: 'Create data provider item',
        responseDto: DataProviderItemDto,
    })
    async create(@Body() request: CreateDataProviderItemRequestDto): Promise<DataProviderItemDto> {
        const result = await this.dataProviderItemService.create(request);
        return result;
    }

    @PutRestApi({
        path: ':id/switch-status/:activeStatus',
        summary: 'Switch active status data provider item',
        responseDto: Boolean,
    })
    async switchActiveStatus(
        @Param('activeStatus', new ParseBoolPipe()) activeStatus: boolean,
        @UUIDParam('id') id: string,
    ): Promise<boolean> {
        const result = await this.dataProviderItemService.switchActiveStatus(id, activeStatus);
        return result;
    }

    @PutRestApi({
        path: ':id',
        summary: 'Update data provider item',
        responseDto: Boolean,
    })
    async update(@UUIDParam('id') id: string, @Body() request: UpdateDataProviderItemRequestDto): Promise<boolean> {
        const result = await this.dataProviderItemService.update(id, request);
        return result;
    }
}
