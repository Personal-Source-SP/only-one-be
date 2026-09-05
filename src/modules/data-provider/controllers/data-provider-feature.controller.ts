import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, BaseApiOkResponse, User, UUIDParam } from '../../../decorators';
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

    @ApiOperation({ summary: 'Get all features by provider ID' })
    @Version('1')
    @Get('data-providers/:dataProviderId')
    @BaseApiOkResponse(DataProviderFeatureDto, { isArray: true })
    public async findByProvider(@UUIDParam('dataProviderId') dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.featureService.getFeaturesByProviderId(dataProviderId);
    }

    @ApiOperation({ summary: 'Get feature by provider ID and type' })
    @Version('1')
    @Get('data-providers/:dataProviderId/:type')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async findByProviderAndType(
        @UUIDParam('dataProviderId') dataProviderId: string,
        @Param('type') type: DataProviderFeatureType,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.getFeatureByProviderIdAndType(dataProviderId, type);
    }

    @ApiOperation({ summary: 'Get version history for feature' })
    @Version('1')
    @Get(':id/versions')
    @BaseApiOkResponse(ConfigVersionDto)
    public async getVersions(@UUIDParam('id') id: string): Promise<ConfigVersionDto[]> {
        return await this.configVersionService.getConfigVersionOptionsByFeature(id);
    }

    @ApiOperation({ summary: 'Get feature by ID' })
    @Version('1')
    @Get(':id')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async findById(@UUIDParam('id') id: string): Promise<DataProviderFeatureDto> {
        return await this.featureService.findById(id);
    }

    @ApiOperation({ summary: 'Test feature stateless (sandbox)' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('test')
    public async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<any> {
        const runner = this.runnerRegistry.getRunner(request.type);
        return await runner.testStateless(request.service || ScraperServiceEnum.GENERIC, request.config, request.input);
    }

    @ApiOperation({ summary: 'Create feature for a data provider' })
    @Version('1')
    @Post('data-providers/:dataProviderId')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async createFeature(
        @UUIDParam('dataProviderId') dataProviderId: string,
        @Body() request: CreateDataProviderFeatureRequestDto,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.createFeature(dataProviderId, request);
    }

    @ApiOperation({ summary: 'Test saved feature contextual' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/test')
    public async testContextual(@UUIDParam('id') id: string, @Body() request?: TestFeatureContextualRequestDto): Promise<any> {
        return await this.featureService.testFeature(id, request?.input);
    }

    @ApiOperation({ summary: 'Rollback feature version' })
    @Version('1')
    @Post(':id/versions/:versionId/rollback')
    @BaseApiOkResponse(Boolean)
    public async rollbackVersion(
        @UUIDParam('id') id: string,
        @Param('versionId', ParseIntPipe) versionId: number,
        @User() user: PayloadDto,
    ): Promise<boolean> {
        return await this.configVersionService.rollbackToVersionIdByFeature(id, versionId, user);
    }

    @ApiOperation({ summary: 'Switch feature status' })
    @Version('1')
    @Put(':id/switch-status/:status')
    @BaseApiOkResponse(Boolean)
    public async switchStatus(@UUIDParam('id') id: string, @Param('status') status: DataProviderFeatureStatus): Promise<boolean> {
        return await this.featureService.switchStatus(id, status);
    }

    @ApiOperation({ summary: 'Update feature configuration' })
    @Version('1')
    @Put(':id')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async updateConfig(
        @UUIDParam('id') id: string,
        @Body() request: UpdateFeatureConfigRequestDto,
        @User() user: PayloadDto,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.updateFeatureConfig(id, request, user);
    }

    @ApiOperation({ summary: 'Delete inactive feature version' })
    @Version('1')
    @Delete(':id/versions/:versionId')
    @BaseApiOkResponse(Boolean)
    public async deleteVersion(@UUIDParam('id') id: string, @Param('versionId', ParseIntPipe) versionId: number): Promise<boolean> {
        return await this.configVersionService.deleteConfigVersionByFeature(id, versionId);
    }
}
