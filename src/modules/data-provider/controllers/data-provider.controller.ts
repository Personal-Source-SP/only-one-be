import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';
import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DATA_PROVIDER_PAGINATION_CONFIG } from '../constants/data-provider-pagination.config';
import { DataProviderDto } from '../dtos/data-provider.dto';
import {
    CreateDataProviderRequestDto,
    DataProviderPaginationRequestDto,
    UpdateDataProviderRequestDto,
    UpdateTargetConfigRequestDto,
} from '../dtos/requests/data-provider-request.dto';
import { ConfigVersionService } from '../services/config-version.service';
import { DataProviderService } from '../services/data-provider.service';

@Controller('data-providers')
@ApiTags('data-providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DataProviderController extends BaseController {
    constructor(
        private readonly dataProviderService: DataProviderService,
        private readonly configVersionService: ConfigVersionService,
    ) {
        super();
    }

    @ApiOperation({ summary: 'Get all data providers' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('all')
    @ApiOkResponse({ type: [DataProviderDto] })
    public async getAll(): Promise<DataProviderDto[]> {
        const result = await this.dataProviderService.getAll();
        return result;
    }

    @ApiOperation({ summary: 'Get data provider by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id')
    @ApiOkResponse({ type: DataProviderDto })
    public async getById(@Param('id', new ParseUUIDPipe()) id: string): Promise<DataProviderDto> {
        const result = await this.dataProviderService.getById(id);
        return result;
    }

    @ApiOperation({ summary: 'Get paginated data provider items' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkPaginatedResponse(DataProviderDto, DATA_PROVIDER_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(DataProviderDto, DATA_PROVIDER_PAGINATION_CONFIG)
    @ApiPaginationQuery(DATA_PROVIDER_PAGINATION_CONFIG)
    public async getDataProvidersPagination(@Paginate() query: DataProviderPaginationRequestDto): Promise<Paginated<DataProviderDto>> {
        const result = await this.dataProviderService.getDataProvidersPagination(query, DATA_PROVIDER_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({ summary: 'Create data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @ApiOkResponse({ type: DataProviderDto })
    public async createDataProvider(@Body() request: CreateDataProviderRequestDto): Promise<DataProviderDto> {
        const result = await this.dataProviderService.createDataProvider(request);
        return result;
    }

    @ApiOperation({ summary: 'Update search config' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Put(':id/target-config')
    @ApiOkResponse({ type: Boolean })
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
    @ApiOkResponse({ type: Boolean })
    public async updateDataProvider(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: UpdateDataProviderRequestDto,
    ): Promise<boolean> {
        const result = await this.dataProviderService.updateDataProvider(id, request);
        return result;
    }

    @ApiOperation({ summary: 'Delete data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':id')
    @ApiOkResponse({ type: Boolean })
    public async deleteDataProvider(@Param('id', new ParseUUIDPipe()) id: string): Promise<boolean> {
        const result = await this.dataProviderService.deleteDataProvider(id);
        return result;
    }
}
