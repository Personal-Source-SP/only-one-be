import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DATA_PROVIDER_PAGINATION_CONFIG } from '../constants/data-provider-pagination.config';
import { DataProviderDto } from '../dtos/data-provider.dto';
import {
    CreateDataProviderRequestDto,
    UpdateDataProviderRequestDto,
    UpdateTargetConfigRequestDto,
} from '../dtos/requests/data-provider-request.dto';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderStatus } from '../enums';
import { DataProviderService } from '../services/data-provider.service';

@Controller('data-providers')
@ApiTags('data-providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DataProviderController extends BaseController<DataProviderEntity, DataProviderDto> {
    constructor(private readonly dataProviderService: DataProviderService) {
        super(dataProviderService, DATA_PROVIDER_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Create data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @BaseApiOkResponse(DataProviderDto)
    public async create(@Body() request: CreateDataProviderRequestDto): Promise<DataProviderDto> {
        const result = await this.dataProviderService.create(request);
        return result;
    }

    @ApiOperation({ summary: 'Switch status data provider' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Put(':id/switch-status/:status')
    @BaseApiOkResponse(Boolean)
    public async switchStatus(@Param('status') status: DataProviderStatus, @Param('id', new ParseUUIDPipe()) id: string): Promise<boolean> {
        const result = await this.dataProviderService.switchStatus(id, status);
        return result;
    }

    @ApiOperation({ summary: 'Update search config' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Put(':id/target-config')
    @BaseApiOkResponse(Boolean)
    public async updateTargetConfig(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: UpdateTargetConfigRequestDto,
    ): Promise<boolean> {
        const result = await this.dataProviderService.updateTargetConfig(id, request);
        return result;
    }

    @ApiOperation({ summary: 'Update data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @BaseApiOkResponse(Boolean)
    public async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() request: UpdateDataProviderRequestDto): Promise<boolean> {
        const result = await this.dataProviderService.update(id, request);
        return result;
    }
}
