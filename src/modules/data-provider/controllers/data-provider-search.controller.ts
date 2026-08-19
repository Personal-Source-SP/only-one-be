import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import {
    SearchProductsRequestDto,
    TestSearchFunctionRequestDto,
    UpdateSearchConfigRequestDto,
} from '../dtos/requests/search-products-request.dto';
import { SearchProductsResponseDto, ValidateSearchConfigurationResponseDto } from '../dtos/responses/search-products-response.dto';
import { DataProviderService } from '../services/data-provider.service';
import { DataProviderSearchService } from '../services/data-provider-search.service';

@Controller('data-providers')
@ApiTags('Data Providers Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DataProviderSearchController {
    constructor(
        private readonly dataProviderSearchService: DataProviderSearchService,
        private readonly dataProviderService: DataProviderService,
    ) {}

    @ApiOperation({ summary: 'Search products by data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('search')
    @BaseApiOkResponse(SearchProductsResponseDto)
    public async searchProducts(@Body() request: SearchProductsRequestDto): Promise<SearchProductsResponseDto> {
        const result = await this.dataProviderSearchService.searchProducts(request);
        return result;
    }

    @ApiOperation({ summary: 'Test search function configuration' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('test-search-function')
    @BaseApiOkResponse(ValidateSearchConfigurationResponseDto)
    public async testSearchFunction(@Body() request: TestSearchFunctionRequestDto): Promise<ValidateSearchConfigurationResponseDto> {
        const result = await this.dataProviderSearchService.validateSearchFunction(request.searchService, request);
        return result;
    }

    @ApiOperation({ summary: 'Update search config of data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id/search-config')
    @BaseApiOkResponse(Boolean)
    public async updateSearchConfig(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: UpdateSearchConfigRequestDto,
    ): Promise<boolean> {
        const result = await this.dataProviderService.updateSearchConfig(id, request);
        return result;
    }
}
