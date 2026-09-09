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
import { DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
import { FeatureRunnerRegistry } from '../runners/feature-runner.registry';
import { DataProviderFeatureService } from '../services/data-provider-feature.service';

@Controller('data-provider-features')
@ApiTags('Data Provider Features')
@Auth()
export class DataProviderFeatureController {
    constructor(
        private readonly runnerRegistry: FeatureRunnerRegistry,
        private readonly featureService: DataProviderFeatureService,
    ) {}

    @Get({
        path: 'data-providers/:dataProviderId',
        summary: 'Get all features by provider ID',
        responseDto: [DataProviderFeatureDto],
    })
    async findByProvider(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.featureService.getFeaturesByProviderId(dataProviderId);
    }

    @Get({
        path: 'data-providers/:dataProviderId/:type',
        summary: 'Get feature by provider ID and type',
        responseDto: DataProviderFeatureDto,
    })
    async findByProviderAndType(
        @UUIDParam('dataProviderId') dataProviderId: string,
        @Param('type') type: DataProviderFeatureType,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.getFeatureByProviderIdAndType(dataProviderId, type);
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
    async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<any> {
        const runner = this.runnerRegistry.getRunner(request.type);
        return await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
    }

    @Post({
        path: 'data-providers/:dataProviderId',
        summary: 'Create feature for a data provider',
        responseDto: DataProviderFeatureDto,
    })
    async createFeature(
        @UUIDParam('dataProviderId') dataProviderId: string,
        @Body() request: CreateDataProviderFeatureRequestDto,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.createFeature(dataProviderId, request);
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
        return await this.featureService.updateFeatureConfig(id, request, user);
    }
}
