import { Body, Controller, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, Get, Post, Put, User, UUIDParam } from '../../../decorators';
import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
import {
    CreateDataProviderFeatureRequestDto,
    TestFeatureStatelessRequestDto,
    UpdateFeatureConfigRequestDto,
} from '../dtos/requests/data-provider-feature-request.dto';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../enums';
import { IExtractDataResponse, ISearchExtractDataResponse } from '../interfaces';
import { DataProviderFeatureService } from '../services/data-provider-feature.service';

@Controller('data-provider-features')
@ApiTags('Data Provider Features')
@Auth()
export class DataProviderFeatureController {
    constructor(private readonly featureService: DataProviderFeatureService) {}

    @Get({
        path: ':dataProviderId',
        summary: 'Get all features by provider ID',
        responseDto: [DataProviderFeatureDto],
    })
    async findByProvider(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.featureService.getByProviderId(dataProviderId);
    }

    @Get({
        path: ':dataProviderId/:type',
        summary: 'Get feature by provider ID and type',
        responseDto: DataProviderFeatureDto,
    })
    async findByProviderAndType(
        @UUIDParam('dataProviderId') dataProviderId: string,
        @Param('type') type: DataProviderFeatureType,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.getByProviderIdAndType(dataProviderId, type);
    }

    @Get({
        path: ':id',
        summary: 'Get feature by ID',
        responseDto: DataProviderFeatureDto,
    })
    async findById(@UUIDParam('id') id: string): Promise<DataProviderFeatureDto> {
        return await this.featureService.findById(id);
    }

    @Post({
        path: 'test',
        summary: 'Test feature stateless (sandbox)',
    })
    async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<IExtractDataResponse | ISearchExtractDataResponse> {
        return await this.featureService.testStateless(request);
    }

    @Post({
        summary: 'Create feature for a data provider',
        responseDto: DataProviderFeatureDto,
    })
    async createFeature(
        @Body() request: CreateDataProviderFeatureRequestDto,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.createFeature(request);
    }

    @Put({
        path: ':id/switch-status/:status',
        summary: 'Switch feature status',
        responseDto: Boolean,
    })
    async switchStatus(@UUIDParam('id') id: string, @Param('status') status: DataProviderFeatureStatus): Promise<boolean> {
        return await this.featureService.switchStatus(id, status);
    }

    @Put({
        path: ':id',
        summary: 'Update feature configuration',
        responseDto: DataProviderFeatureDto,
    })
    async updateConfig(
        @UUIDParam('id') id: string,
        @Body() request: UpdateFeatureConfigRequestDto,
        @User() user: PayloadDto,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.updateFeature(id, request, user);
    }
}
