import { Body, Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, Get, Post, Put, UUIDParam } from '../../../decorators';
import { DATA_PROVIDER_PAGINATION_CONFIG } from '../constants/data-provider-pagination.config';
import { DataProviderDto } from '../dtos/data-provider.dto';
import {
    CreateDataProviderRequestDto,
    FindDataProvidersWithFeaturesRequestDto,
    UpdateDataProviderRequestDto,
} from '../dtos/requests/data-provider-request.dto';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderService } from '../services/data-provider.service';

@Controller('data-providers')
@ApiTags('Data Providers')
@Auth()
export class DataProviderController extends BaseController<DataProviderEntity, DataProviderDto> {
    constructor(private readonly dataProviderService: DataProviderService) {
        super(dataProviderService, DATA_PROVIDER_PAGINATION_CONFIG);
    }

    @Get({
        path: 'all-with-features',
        summary: 'Get all data providers with features (optionally filtered by feature type/status)',
        responseDto: [DataProviderDto],
    })
    async getAllWithFeatures(@Query() query: FindDataProvidersWithFeaturesRequestDto): Promise<DataProviderDto[]> {
        const result = await this.dataProviderService.findAllWithFeatures(query);
        return result;
    }

    @Post({
        summary: 'Create data provider',
        responseDto: DataProviderDto,
    })
    async create(@Body() request: CreateDataProviderRequestDto): Promise<DataProviderDto> {
        const result = await this.dataProviderService.create(request);
        return result;
    }

    @Put({
        path: ':id',
        summary: 'Update data provider',
        responseDto: Boolean,
    })
    async update(@UUIDParam('id') id: string, @Body() request: UpdateDataProviderRequestDto): Promise<boolean> {
        const result = await this.dataProviderService.update(id, request);
        return result;
    }
}
