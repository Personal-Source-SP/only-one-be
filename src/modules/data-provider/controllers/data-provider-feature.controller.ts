import { Body, Controller, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, DeleteRestApi, GetRestApi, PostRestApi, PutRestApi, User, UUIDParam } from '../../../decorators';
import { ConfigVersionDto } from '../dtos/config-version.dto';
import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
import {
    CreateDataProviderFeatureRequestDto,
    TestFeatureContextualRequestDto,
    TestFeatureStatelessRequestDto,
    UpdateFeatureConfigRequestDto,
} from '../dtos/requests/data-provider-feature-request.dto';
import { DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
import { FeatureRunnerRegistry } from '../runners/feature-runner.registry';
import { ConfigVersionService } from '../services/config-version.service';
import { DataProviderFeatureService } from '../services/data-provider-feature.service';

@Controller('data-provider-features')
@ApiTags('Data Provider Features')
@Auth()
export class DataProviderFeatureController {
    constructor(
        private readonly runnerRegistry: FeatureRunnerRegistry,
        private readonly featureService: DataProviderFeatureService,
        private readonly configVersionService: ConfigVersionService,
    ) {}

    @GetRestApi({
        path: 'data-providers/:dataProviderId',
        summary: 'Get all features by provider ID',
        responseDto: DataProviderFeatureDto,
        isArray: true,
    })
    async findByProvider(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.featureService.getFeaturesByProviderId(dataProviderId);
    }

    @GetRestApi({
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

    @GetRestApi({
        path: ':id/versions',
        summary: 'Get version history for feature',
        responseDto: ConfigVersionDto,
        isArray: true,
    })
    async getVersions(@UUIDParam('id') id: string): Promise<ConfigVersionDto[]> {
        return await this.configVersionService.getConfigVersionOptionsByFeature(id);
    }

    @GetRestApi({
        path: ':id',
        summary: 'Get feature by ID',
        responseDto: DataProviderFeatureDto,
    })
    async findById(@UUIDParam('id') id: string): Promise<DataProviderFeatureDto> {
        return await this.featureService.findById(id);
    }

    @PostRestApi({
        path: 'test',
        summary: 'Test feature stateless (sandbox)',
    })
    async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<any> {
        const runner = this.runnerRegistry.getRunner(request.type);
        return await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
    }

    @PostRestApi({
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

    @PostRestApi({
        path: ':id/test',
        summary: 'Test saved feature contextual',
    })
    async testContextual(@UUIDParam('id') id: string, @Body() request?: TestFeatureContextualRequestDto): Promise<any> {
        return await this.featureService.testFeature(id, request?.input);
    }

    @PostRestApi({
        path: ':id/versions/:versionId/rollback',
        summary: 'Rollback feature version',
        responseDto: Boolean,
    })
    async rollbackVersion(
        @UUIDParam('id') id: string,
        @Param('versionId', ParseIntPipe) versionId: number,
        @User() user: PayloadDto,
    ): Promise<boolean> {
        return await this.configVersionService.rollbackToVersionIdByFeature(id, versionId, user);
    }

    @PutRestApi({
        path: ':id/switch-status/:status',
        summary: 'Switch feature status',
        responseDto: Boolean,
    })
    async switchStatus(@UUIDParam('id') id: string, @Param('status') status: DataProviderFeatureStatus): Promise<boolean> {
        return await this.featureService.switchStatus(id, status);
    }

    @PutRestApi({
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

    @DeleteRestApi({
        path: ':id/versions/:versionId',
        summary: 'Delete inactive feature version',
        responseDto: Boolean,
    })
    async deleteVersion(@UUIDParam('id') id: string, @Param('versionId', ParseIntPipe) versionId: number): Promise<boolean> {
        return await this.configVersionService.deleteConfigVersionByFeature(id, versionId);
    }
}
