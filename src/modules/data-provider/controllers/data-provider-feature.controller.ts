import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    UseGuards,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { ConfigVersionDto } from '../dtos/config-version.dto';
import { DataProviderFeatureDto } from '../dtos/data-provider-feature.dto';
import {
    CreateDataProviderFeatureRequestDto,
    TestFeatureContextualRequestDto,
    TestFeatureStatelessRequestDto,
    UpdateFeatureConfigRequestDto,
} from '../dtos/requests/data-provider-feature-request.dto';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../enums';
import { FeatureRunnerRegistry } from '../runners/feature-runner.registry';
import { ConfigVersionService } from '../services/config-version.service';
import { DataProviderFeatureService } from '../services/data-provider-feature.service';

@Controller('data-provider-features')
@ApiTags('Data Provider Features')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DataProviderFeatureController {
    constructor(
        private readonly featureService: DataProviderFeatureService,
        private readonly configVersionService: ConfigVersionService,
        private readonly runnerRegistry: FeatureRunnerRegistry,
    ) {}

    @ApiOperation({ summary: 'Test feature stateless (sandbox)' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('test')
    public async testStateless(@Body() request: TestFeatureStatelessRequestDto): Promise<any> {
        const runner = this.runnerRegistry.getRunner(request.type);
        return await runner.testStateless(request.service || 'generic', request.config, request.input);
    }

    @ApiOperation({ summary: 'Get feature by ID' })
    @Version('1')
    @Get(':id')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<DataProviderFeatureDto> {
        return await this.featureService.findById(id);
    }

    @ApiOperation({ summary: 'Get all features by provider ID' })
    @Version('1')
    @Get('data-providers/:dataProviderId')
    @BaseApiOkResponse(DataProviderFeatureDto, { isArray: true })
    public async findByProvider(@Param('dataProviderId', new ParseUUIDPipe()) dataProviderId: string): Promise<DataProviderFeatureDto[]> {
        return await this.featureService.getFeaturesByProviderId(dataProviderId);
    }

    @ApiOperation({ summary: 'Get feature by provider ID and type' })
    @Version('1')
    @Get('data-providers/:dataProviderId/:type')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async findByProviderAndType(
        @Param('dataProviderId', new ParseUUIDPipe()) dataProviderId: string,
        @Param('type') type: DataProviderFeatureType,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.getFeatureByProviderIdAndType(dataProviderId, type);
    }

    @ApiOperation({ summary: 'Create feature for a data provider' })
    @Version('1')
    @Post('data-providers/:dataProviderId')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async createFeature(
        @Param('dataProviderId', new ParseUUIDPipe()) dataProviderId: string,
        @Body() request: CreateDataProviderFeatureRequestDto,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.createFeature(dataProviderId, request);
    }

    @ApiOperation({ summary: 'Update feature configuration' })
    @Version('1')
    @Put(':id')
    @BaseApiOkResponse(DataProviderFeatureDto)
    public async updateConfig(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: UpdateFeatureConfigRequestDto,
        @User() user: PayloadDto,
    ): Promise<DataProviderFeatureDto> {
        return await this.featureService.updateFeatureConfig(id, request, user);
    }

    @ApiOperation({ summary: 'Test saved feature contextual' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/test')
    public async testContextual(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request?: TestFeatureContextualRequestDto,
    ): Promise<any> {
        return await this.featureService.testFeature(id, request?.input);
    }

    @ApiOperation({ summary: 'Switch feature status' })
    @Version('1')
    @Put(':id/switch-status/:status')
    @BaseApiOkResponse(Boolean)
    public async switchStatus(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Param('status') status: DataProviderFeatureStatus,
    ): Promise<boolean> {
        return await this.featureService.switchStatus(id, status);
    }

    @ApiOperation({ summary: 'Get version history for feature' })
    @Version('1')
    @Get(':id/versions')
    @BaseApiOkResponse(ConfigVersionDto)
    public async getVersions(@Param('id', new ParseUUIDPipe()) id: string): Promise<ConfigVersionDto[]> {
        return await this.configVersionService.getConfigVersionOptionsByFeature(id);
    }

    @ApiOperation({ summary: 'Rollback feature version' })
    @Version('1')
    @Post(':id/versions/:versionId/rollback')
    @BaseApiOkResponse(Boolean)
    public async rollbackVersion(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Param('versionId', ParseIntPipe) versionId: number,
        @User() user: PayloadDto,
    ): Promise<boolean> {
        return await this.configVersionService.rollbackToVersionIdByFeature(id, versionId, user);
    }

    @ApiOperation({ summary: 'Delete inactive feature version' })
    @Version('1')
    @Delete(':id/versions/:versionId')
    @BaseApiOkResponse(Boolean)
    public async deleteVersion(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Param('versionId', ParseIntPipe) versionId: number,
    ): Promise<boolean> {
        return await this.configVersionService.deleteConfigVersionByFeature(id, versionId);
    }
}
